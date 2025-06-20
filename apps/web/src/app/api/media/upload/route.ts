import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MediaService } from '@vyral/core';
import { connectDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Connect to database and get session
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use the core MediaService
    const mediaService = new MediaService();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate unique filename and save file
    const fileExtension = file.name.split('.').pop() || '';
    const uniqueId = uuidv4();
    const filename = `${uniqueId}.${fileExtension}`;
    
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Use MediaService to save to database
    const mediaData = {
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: filePath,
      url: `/uploads/${filename}`,
      uploadedBy: session.user.id,
      alt: formData.get('alt') as string || '',
      caption: formData.get('caption') as string || '',
      tags: JSON.parse(formData.get('tags') as string || '[]'),
      isPublic: true,
      metadata: {}
    };

    const savedMedia = await mediaService.uploadMedia(mediaData);

    return NextResponse.json({
      success: true,
      data: savedMedia,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      },
      { status: 500 }
    );
  }
}