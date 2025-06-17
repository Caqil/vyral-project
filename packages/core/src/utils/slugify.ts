import slugify from 'slugify';

export interface SlugifyOptions {
  replacement?: string;
  remove?: RegExp;
  lower?: boolean;
  strict?: boolean;
  locale?: string;
  trim?: boolean;
}

export function createSlug(
  input: string,
  options: SlugifyOptions = {}
): string {
  const defaultOptions: SlugifyOptions = {
    replacement: '-',
    lower: true,
    strict: true,
    trim: true,
    ...options
  };

  return slugify(input, defaultOptions);
}

export function createUniqueSlug(
  input: string,
  existingCallback: (slug: string) => Promise<boolean>,
  options: SlugifyOptions = {}
): Promise<string> {
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