import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/types/index.ts',
    'src/utils/index.ts',
    'src/services/index.ts',
    'src/models/index.ts',
    'src/database/index.ts',
    'src/constants/index.ts',
    'src/errors/index.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  external: [
    'mongodb',
    'mongoose',
    'bcryptjs',
    'jsonwebtoken',
    'sharp',
    'crypto-js'
  ],
  esbuildOptions(options) {
    options.conditions = ['node'];
    options.platform = 'node';
  },
});