import type { RequestHandler } from "express";
import { CardService } from "../services/core/card.service";
import { getCardsQuerySchema } from "../utils/validator";
import type { z } from "zod";

type GetCardsQuery = z.infer<typeof getCardsQuerySchema>;

const cardService = new CardService();

export const addCard: RequestHandler = async (req, res, next) => {
  try {
    const card = await cardService.addCard(req.body);
    res.status(201).json({
      id: card.id,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      isDefault: card.isDefault,
      createdAt: card.createdAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
};

export const getCards: RequestHandler = async (_req, res, next) => {
  try {
    const q = (res.locals as { validatedQuery: GetCardsQuery }).validatedQuery;
    const cards = await cardService.getCardsByEmail(q.email);
    res.json({ cards });
  } catch (e) {
    next(e);
  }
};
