import { Database } from '@vyral/core';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const db = Database.getInstance();
    
    console.log('🧪 Testing database connection...');
    
    if (!db.isConnected()) {
      console.log('🔌 Database not connected, attempting connection...');
      await db.connect({
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/vyral_cms'
      });
    }
    
    console.log('✅ Database connection test successful');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      connected: db.isConnected()
    });
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}