import { NextRequest, NextResponse } from 'next/server';
import { UserService, validateData } from '@vyral/core';
import { connectDB } from '@/lib/db';
import { z } from 'zod';

const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  displayName: z.string().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const userData = validateData(registerSchema, body);

    const userService = new UserService(process.env.JWT_SECRET!);
    
    // Set default role to subscriber for new registrations
    const user = await userService.createUser({
      ...userData,
      role: 'subscriber',
      status: 'pending', // Require email verification
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to create account'
    }, { status: 400 });
  }
}
