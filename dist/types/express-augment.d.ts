export {};
declare global {
    namespace Express {
        interface Locals {
            validatedQuery?: {
                email: string;
            };
        }
    }
}
//# sourceMappingURL=express-augment.d.ts.map