"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const provider_factory_1 = require("./provider.factory");
const stripe_provider_1 = require("./stripe.provider");
(0, provider_factory_1.registerProvider)("stripe", () => new stripe_provider_1.StripeProvider());
//# sourceMappingURL=register.js.map