export declare class AppError extends Error {
    readonly status: number;
    readonly code?: string | undefined;
    constructor(message: string, status?: number, code?: string | undefined);
}
export declare class ProviderError extends Error {
    readonly provider: string;
    readonly code?: string | undefined;
    constructor(message: string, provider: string, code?: string | undefined);
}
//# sourceMappingURL=errors.d.ts.map