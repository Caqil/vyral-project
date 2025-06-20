// Create: apps/web/src/lib/startup.ts
import { ModuleManager } from '@vyral/core';
import { connectDB } from './db';

let initialized = false;

export async function initializeServer() {
  if (initialized) {
    console.log('🟡 Server already initialized, skipping...');
    return;
  }

  console.log('🚀 Initializing server...');
  
  try {
    // 1. Connect to database
    console.log('📊 Connecting to database...');
    await connectDB();
    console.log('✅ Database connected');

    // 2. Initialize modules
    console.log('🔌 Initializing installed modules...');
    const moduleManager = new ModuleManager();
    await moduleManager.initializeInstalledModules();
    console.log('✅ Modules initialized');

    initialized = true;
    console.log('🎉 Server initialization complete!');
  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    throw error;
  }
}

// Ensure initialization runs on server startup
if (typeof window === 'undefined') {
  // Only run on server side
  initializeServer().catch(console.error);
}