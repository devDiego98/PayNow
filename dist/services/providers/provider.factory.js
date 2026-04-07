"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderFactory = void 0;
exports.registerProvider = registerProvider;
exports.getProvider = getProvider;
const registry = new Map();
function registerProvider(name, factory) {
    registry.set(name, factory);
}
function getProvider(name) {
    const factory = registry.get(name);
    if (!factory) {
        throw new Error(`Unknown provider: ${name}`);
    }
    return factory();
}
/** @deprecated Prefer named imports; kept for tests that mock `ProviderFactory.get`. */
class ProviderFactory {
    static get(name) {
        return getProvider(name);
    }
}
exports.ProviderFactory = ProviderFactory;
//# sourceMappingURL=provider.factory.js.map