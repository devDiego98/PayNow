import type { IPaymentProvider, ProviderName } from "../../types/provider.types";

const registry = new Map<ProviderName, () => IPaymentProvider>();

export function registerProvider(name: ProviderName, factory: () => IPaymentProvider): void {
  registry.set(name, factory);
}

export function getProvider(name: ProviderName): IPaymentProvider {
  const factory = registry.get(name);
  if (!factory) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return factory();
}

/** @deprecated Prefer named imports; kept for tests that mock `ProviderFactory.get`. */
export class ProviderFactory {
  static get(name: ProviderName): IPaymentProvider {
    return getProvider(name);
  }
}
