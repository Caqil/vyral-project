import slugify from 'slugify';
export function createSlug(input, options = {}) {
    const defaultOptions = {
        replacement: '-',
        lower: true,
        strict: true,
        trim: true,
        ...options
    };
    return slugify(input, defaultOptions);
}
export function createUniqueSlug(input, existingCallback, options = {}) {
    return new Promise(async (resolve) => {
        let baseSlug = createSlug(input, options);
        let slug = baseSlug;
        let counter = 1;
        while (await existingCallback(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        resolve(slug);
    });
}
//# sourceMappingURL=slugify.js.map