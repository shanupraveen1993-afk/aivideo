import { NextRequest, NextResponse } from 'next/server';
import { AI_CONFIG } from '@/lib/ai/config';
import { createAdminSessionToken } from '@/lib/auth/admin';

export async function POST(req: NextRequest) {
  try {
    const configuredPassword = AI_CONFIG.ADMIN_PASSWORD;

    if (!configuredPassword || configuredPassword.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Server configuration error: ADMIN_PASSWORD environment variable is missing.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { password } = body;

    if (!password || password.trim() !== configuredPassword.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid Admin Password' },
        { status: 401 }
      );
    }

    const sessionToken = createAdminSessionToken(configuredPassword);

    const response = NextResponse.json({
      success: true,
      message: 'Admin authentication successful.'
    });

    response.cookies.set('maharaja_admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error('Admin Login Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
