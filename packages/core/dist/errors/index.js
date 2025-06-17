export class VyralError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details) {
        super(message);
        this.name = 'VyralError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class ValidationError extends VyralError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', 400, details);
        this.name = 'ValidationError';
    }
}
export class NotFoundError extends VyralError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 'NOT_FOUND', 404);
        this.name = 'NotFoundError';
    }
}
export class UnauthorizedError extends VyralError {
    constructor(message = 'Unauthorized') {
        super(message, 'UNAUTHORIZED', 401);
        this.name = 'UnauthorizedError';
    }
}
export class ForbiddenError extends VyralError {
    constructor(message = 'Forbidden') {
        super(message, 'FORBIDDEN', 403);
        this.name = 'ForbiddenError';
    }
}
export class ConflictError extends VyralError {
    constructor(message) {
        super(message, 'CONFLICT', 409);
        this.name = 'ConflictError';
    }
}
export class DatabaseError extends VyralError {
    constructor(message, details) {
        super(message, 'DATABASE_ERROR', 500, details);
        this.name = 'DatabaseError';
    }
}
//# sourceMappingURL=index.js.map