// src/app/api/admin/modules/[id]/menu/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

interface ModuleMenuItem {
  id: string;
  name: string;
  href: string;
  icon?: string;
  order?: number;
  permission?: string;
  badge?: string | number;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper function to check user permissions
function hasPermission(user: any, permission: string): boolean {
  // For now, check if user is admin or super_admin
  const adminRoles = ['admin', 'super_admin'];
  return adminRoles.includes(user.role);
}

// GET /api/admin/modules/[id]/menu - Get module menu items
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    console.log('🔍 Menu API: Getting menu items...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('❌ Menu API: Unauthorized - no session');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission to manage modules
    if (!hasPermission(session.user, 'modules.manage')) {
      console.log('❌ Menu API: Insufficient permissions');
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    console.log('📋 Menu API: Looking for module:', resolvedParams.id);

    await connectDB();
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection is not established');
    }
    
    const modulesCollection = mongoose.connection.db.collection('modules');

    // Find the module by slug or id
    const module = await modulesCollection.findOne({
      $or: [
        { 'manifest.slug': resolvedParams.id },
        { '_id': new mongoose.Types.ObjectId(resolvedParams.id) }
      ]
    });

    if (!module) {
      console.log('❌ Menu API: Module not found');
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    console.log('✅ Menu API: Module found:', module.manifest?.name);

    return NextResponse.json({
      menuItems: module.manifest?.menuItems || [],
      menuGroups: module.manifest?.menuGroups || [],
    });

  } catch (error) {
    console.error("❌ Menu API Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}

// PUT /api/admin/modules/[id]/menu - Update module menu items
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    console.log('💾 Menu API: Updating menu items...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission to manage modules
    if (!hasPermission(session.user, 'modules.manage')) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const body = await request.json();
    const { menuItems, menuGroups } = body;

    // Validate menu items structure
    if (menuItems && !Array.isArray(menuItems)) {
      return NextResponse.json(
        { error: "menuItems must be an array" },
        { status: 400 }
      );
    }

    // Validate each menu item
    if (menuItems) {
      for (const item of menuItems) {
        if (!item.id || !item.name || !item.href) {
          return NextResponse.json(
            { error: "Each menu item must have id, name, and href" },
            { status: 400 }
          );
        }
      }
    }

    await connectDB();
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection is not established');
    }
    
    const modulesCollection = mongoose.connection.db.collection('modules');

    // Find and update the module
    const updateData: any = {};
    
    if (menuItems !== undefined) {
      updateData['manifest.menuItems'] = menuItems.map((item: ModuleMenuItem) => ({
        ...item,
        moduleSlug: resolvedParams.id,
      }));
    }
    
    if (menuGroups !== undefined) {
      updateData['manifest.menuGroups'] = menuGroups;
    }

    const result = await modulesCollection.updateOne(
      { 
        $or: [
          { 'manifest.slug': resolvedParams.id },
          { '_id': new mongoose.Types.ObjectId(resolvedParams.id) }
        ]
      },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    console.log('✅ Menu API: Menu items updated successfully');
    return NextResponse.json({
      success: true,
      message: "Menu items updated successfully",
    });

  } catch (error) {
    console.error("❌ Menu API Update Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/modules/[id]/menu - Clear module menu items
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    console.log('🗑️ Menu API: Clearing menu items...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission to manage modules
    if (!hasPermission(session.user, 'modules.manage')) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;

    await connectDB();
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection is not established');
    }
    
    const modulesCollection = mongoose.connection.db.collection('modules');

    const result = await modulesCollection.updateOne(
      { 
        $or: [
          { 'manifest.slug': resolvedParams.id },
          { '_id': new mongoose.Types.ObjectId(resolvedParams.id) }
        ]
      },
      { 
        $unset: {
          'manifest.menuItems': '',
          'manifest.menuGroups': '',
        },
        $set: {
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    console.log('✅ Menu API: Menu items cleared successfully');
    return NextResponse.json({
      success: true,
      message: "Menu items cleared successfully",
    });

  } catch (error) {
    console.error("❌ Menu API Delete Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}