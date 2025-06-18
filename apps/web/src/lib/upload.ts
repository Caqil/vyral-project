import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { generateUniqueFilename, validateFile } from '../../../../packages/core/src/utils/file';

export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  destination?: string;
}

export async function handleFileUpload(
  file: File,
  options: UploadOptions = {}
): Promise<{ filename: string; path: string; url: string }> {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    destination = 'uploads'
  } = options;

  // Validate file
  const validation = validateFile(
    { name: file.name, size: file.size, type: file.type },
    { maxSize, allowedMimeTypes: allowedTypes }
  );

  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Generate unique filename
  const filename = generateUniqueFilename(file.name);
  
  // Create upload directory if it doesn't exist
  const uploadDir = join(process.cwd(), 'public', destination);
  await mkdir(uploadDir, { recursive: true });

  // Save file
  const filepath = join(uploadDir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  return {
    filename,
    path: filepath,
    url: `/${destination}/${filename}`
  };
}