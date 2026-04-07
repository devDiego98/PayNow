"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoPagoProvider = void 0;
const base_provider_1 = require("./base.provider");
class MercadoPagoProvider extends base_provider_1.BaseProvider {
    name = "mercadopago";
    charge(_request) {
        return Promise.reject(new Error("Mercado Pago provider not implemented"));
    }
    refund(_request) {
        return Promise.reject(new Error("Mercado Pago provider not implemented"));
    }
    getTransaction(_providerTransactionId) {
        return Promise.resolve(null);
    }
    verifyWebhookSignature(_payload, _signature) {
        return false;
    }
    normalizeWebhookEvent(_rawEvent) {
        throw new Error("Mercado Pago provider not implemented");
    }
}
exports.MercadoPagoProvider = MercadoPagoProvider;
//# sourceMappingURL=mercadopago.provider.js.map