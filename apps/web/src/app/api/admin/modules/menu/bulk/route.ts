import { ModuleMenuItem } from "@/hooks/useModuleMenu";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (
      !session?.user ||
      !(await hasPermission(session.user.id, 'modules.manage'))
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { operations } = body;

    if (!Array.isArray(operations)) {
      return NextResponse.json(
        { error: "operations must be an array" },
        { status: 400 }
      );
    }

    await connectDB();
    
    if (!mongoose.connection.db) {
      throw new Error('Database connection is not established');
    }
    
    const modulesCollection = mongoose.connection.db.collection('modules');

    type BulkMenuResult = { moduleSlug: any; success: boolean; error?: string };
    const results: BulkMenuResult[] = [];

    for (const operation of operations) {
      const { moduleSlug, action, menuItems, menuGroups } = operation;

      try {
        switch (action) {
          case 'update':
            const updateResult = await modulesCollection.updateOne(
              { 'manifest.slug': moduleSlug },
              { 
                $set: {
                  'manifest.menuItems': menuItems?.map((item: ModuleMenuItem) => ({
                    ...item,
                    moduleSlug,
                  })),
                  'manifest.menuGroups': menuGroups,
                  updatedAt: new Date(),
                }
              }
            );
            results.push({ moduleSlug, success: updateResult.matchedCount > 0 });
            break;

          case 'clear':
            const clearResult = await modulesCollection.updateOne(
              { 'manifest.slug': moduleSlug },
              { 
                $unset: {
                  'manifest.menuItems': '',
                  'manifest.menuGroups': '',
                },
                $set: { updatedAt: new Date() }
              }
            );
            results.push({ moduleSlug, success: clearResult.matchedCount > 0 });
            break;

          default:
            results.push({ 
              moduleSlug, 
              success: false, 
              error: `Unknown action: ${action}` 
            });
        }
      } catch (error) {
        results.push({ 
          moduleSlug, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error("Error in bulk menu operations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}