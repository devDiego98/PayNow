"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveWebhook = void 0;
const mercadopagoWebhook_service_1 = require("../services/mercadopago/mercadopagoWebhook.service");
const mercadopagoWebhookService = new mercadopagoWebhook_service_1.MercadoPagoWebhookService();
const receiveWebhook = async (req, res, next) => {
    try {
        const provider = req.params.provider;
        if (provider === "mercadopago") {
            const result = await mercadopagoWebhookService.handleNotification(req);
            res.status(200).json({ received: true, ...result });
            return;
        }
        res.status(501).json({ message: "Not implemented", provider });
    }
    catch (e) {
        next(e);
    }
};
exports.receiveWebhook = receiveWebhook;
//# sourceMappingURL=webhook.controller.js.map