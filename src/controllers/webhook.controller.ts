import type { RequestHandler } from "express";
import { MercadoPagoWebhookService } from "../services/mercadopago/mercadopagoWebhook.service";

const mercadopagoWebhookService = new MercadoPagoWebhookService();

export const receiveWebhook: RequestHandler = async (req, res, next) => {
  try {
    const provider = req.params.provider;
    if (provider === "mercadopago") {
      const result = await mercadopagoWebhookService.handleNotification(req);
      res.status(200).json({ received: true, ...result });
      return;
    }
    res.status(501).json({ message: "Not implemented", provider });
  } catch (e) {
    next(e);
  }
};
