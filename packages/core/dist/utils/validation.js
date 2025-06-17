import { z } from 'zod';
import { ValidationError } from '../errors';
export function validateData(schema, data) {
    try {
        return schema.parse(data);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code
            }));
            throw new ValidationError('Validation failed', formattedErrors);
        }
        throw error;
    }
}
export function validatePartialData(schema, data) {
    try {
        return schema.partial().parse(data);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code
            }));
            throw new ValidationError('Validation failed', formattedErrors);
        }
        throw error;
    }
}
// Common validation schemas
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
export const emailSchema = z.string().email('Invalid email address');
export const urlSchema = z.string().url('Invalid URL');
export const slugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format');
//# sourceMappingURL=validation.js.map