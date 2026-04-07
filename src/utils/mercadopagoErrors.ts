/** Parse REST errors thrown by the Mercado Pago Node SDK (JSON body or Error). */
export function mercadoPagoApiErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (!e || typeof e !== "object") return "Mercado Pago request failed";
  const o = e as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  const cause = o.cause;
  if (Array.isArray(cause) && cause[0] && typeof cause[0] === "object") {
    const c0 = cause[0] as Record<string, unknown>;
    if (typeof c0.description === "string") return c0.description;
  }
  if (typeof o.error === "string") return o.error;
  return "Mercado Pago request failed";
}

export function mercadoPagoApiErrorCode(e: unknown): string | undefined {
  if (!e || typeof e !== "object") return undefined;
  const o = e as Record<string, unknown>;
  if (typeof o.error === "string" && o.error.length < 64) return o.error;
  const cause = o.cause;
  if (Array.isArray(cause) && cause[0] && typeof cause[0] === "object") {
    const code = (cause[0] as Record<string, unknown>).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}
