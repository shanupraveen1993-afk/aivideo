import { NextRequest, NextResponse } from 'next/server';
import { AI_CONFIG } from '@/lib/ai/config';
import { getDb, getMockStore, hashToken, generateDeviceToken } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const configuredPin = AI_CONFIG.TV_SETUP_PIN;

    // Fix 4: If TV_SETUP_PIN environment variable is not configured, fail safely
    if (!configuredPin || configuredPin.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Server configuration error: TV_SETUP_PIN environment variable is missing.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { setupPin } = body;

    if (!setupPin || setupPin.toString().trim() !== configuredPin.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid Setup PIN' },
        { status: 401 }
      );
    }

    const rawDeviceToken = generateDeviceToken();
    const tokenHash = hashToken(rawDeviceToken);
    const db = getDb();
    const now = new Date().toISOString();

    if (db) {
      await db.collection('screens').doc('maharaja-main').set({
        id: 'maharaja-main',
        name: 'Maharaja Main Display (Thanjavur)',
        paired: true,
        tokenHash,
        lastSeenAt: now,
        createdAt: now
      }, { merge: true });
    } else {
      const mockStore = getMockStore();
      mockStore.screens.set('maharaja-main', {
        id: 'maharaja-main',
        name: 'Maharaja Main Display (Thanjavur)',
        paired: true,
        tokenHash,
        lastSeenAt: now
      });
    }

    return NextResponse.json({
      success: true,
      screenId: 'maharaja-main',
      deviceToken: rawDeviceToken
    });
  } catch (error: any) {
    console.error('TV Register Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
