"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mercadoPagoApiErrorMessage = mercadoPagoApiErrorMessage;
exports.mercadoPagoApiErrorCode = mercadoPagoApiErrorCode;
/** Parse REST errors thrown by the Mercado Pago Node SDK (JSON body or Error). */
function mercadoPagoApiErrorMessage(e) {
    if (e instanceof Error)
        return e.message;
    if (!e || typeof e !== "object")
        return "Mercado Pago request failed";
    const o = e;
    if (typeof o.message === "string")
        return o.message;
    const cause = o.cause;
    if (Array.isArray(cause) && cause[0] && typeof cause[0] === "object") {
        const c0 = cause[0];
        if (typeof c0.description === "string")
            return c0.description;
    }
    if (typeof o.error === "string")
        return o.error;
    return "Mercado Pago request failed";
}
function mercadoPagoApiErrorCode(e) {
    if (!e || typeof e !== "object")
        return undefined;
    const o = e;
    if (typeof o.error === "string" && o.error.length < 64)
        return o.error;
    const cause = o.cause;
    if (Array.isArray(cause) && cause[0] && typeof cause[0] === "object") {
        const code = cause[0].code;
        if (typeof code === "string")
            return code;
    }
    return undefined;
}
//# sourceMappingURL=mercadopagoErrors.js.map