export interface SlugifyOptions {
    replacement?: string;
    remove?: RegExp;
    lower?: boolean;
    strict?: boolean;
    locale?: string;
    trim?: boolean;
}
export declare function createSlug(input: string, options?: SlugifyOptions): string;
export declare function createUniqueSlug(input: string, existingCallback: (slug: string) => Promise<boolean>, options?: SlugifyOptions): Promise<string>;
//# sourceMappingURL=slugify.d.ts.map