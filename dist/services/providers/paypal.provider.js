"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayPalProvider = void 0;
const base_provider_1 = require("./base.provider");
class PayPalProvider extends base_provider_1.BaseProvider {
    name = "paypal";
    charge(_request) {
        return Promise.reject(new Error("PayPal provider not implemented"));
    }
    refund(_request) {
        return Promise.reject(new Error("PayPal provider not implemented"));
    }
    getTransaction(_providerTransactionId) {
        return Promise.resolve(null);
    }
    verifyWebhookSignature(_payload, _signature) {
        return false;
    }
    normalizeWebhookEvent(_rawEvent) {
        throw new Error("PayPal provider not implemented");
    }
}
exports.PayPalProvider = PayPalProvider;
//# sourceMappingURL=paypal.provider.js.map