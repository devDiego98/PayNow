"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCards = exports.addCard = void 0;
const card_service_1 = require("../services/core/card.service");
const cardService = new card_service_1.CardService();
const addCard = async (req, res, next) => {
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
    }
    catch (e) {
        next(e);
    }
};
exports.addCard = addCard;
const getCards = async (_req, res, next) => {
    try {
        const q = res.locals.validatedQuery;
        const cards = await cardService.getCardsByEmail(q.email);
        res.json({ cards });
    }
    catch (e) {
        next(e);
    }
};
exports.getCards = getCards;
//# sourceMappingURL=card.controller.js.map