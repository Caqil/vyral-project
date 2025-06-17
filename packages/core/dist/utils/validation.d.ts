import { z } from 'zod';
export declare function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T;
export declare function validatePartialData<T>(schema: z.ZodSchema<T>, data: unknown): Partial<T>;
export declare const objectIdSchema: any;
export declare const emailSchema: any;
export declare const urlSchema: any;
export declare const slugSchema: any;
//# sourceMappingURL=validation.d.ts.map