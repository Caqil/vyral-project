export declare class VyralError extends Error {
    code: string;
    statusCode: number;
    details?: any;
    constructor(message: string, code?: string, statusCode?: number, details?: any);
}
export declare class ValidationError extends VyralError {
    constructor(message: string, details?: any);
}
export declare class NotFoundError extends VyralError {
    constructor(resource?: string);
}
export declare class UnauthorizedError extends VyralError {
    constructor(message?: string);
}
export declare class ForbiddenError extends VyralError {
    constructor(message?: string);
}
export declare class ConflictError extends VyralError {
    constructor(message: string);
}
export declare class DatabaseError extends VyralError {
    constructor(message: string, details?: any);
}
//# sourceMappingURL=index.d.ts.map