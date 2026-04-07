import { registerProvider } from "./provider.factory";
import { StripeProvider } from "./stripe.provider";

registerProvider("stripe", () => new StripeProvider());
