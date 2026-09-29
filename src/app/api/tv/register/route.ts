import { NextRequest, NextResponse } from 'next/server';
import { AI_CONFIG } from '@/lib/ai/config';
import { getDb, getMockStore, hashToken, generateDeviceToken } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { setupPin } = body;

    if (!setupPin || setupPin.toString().trim() !== AI_CONFIG.TV_SETUP_PIN) {
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
      // Real Firestore update
      await db.collection('screens').doc('maharaja-main').set({
        id: 'maharaja-main',
        name: 'Maharaja Main Display (Thanjavur)',
        paired: true,
        tokenHash,
        lastSeenAt: now,
        createdAt: now
      }, { merge: true });
    } else {
      // Mock Store update
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
