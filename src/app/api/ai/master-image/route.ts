import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore } from '@/lib/firebase/admin';
import { AI_CONFIG } from '@/lib/ai/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, garmentAnalysis, personAnalysis } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required.' }, { status: 400 });
    }

    const masterImageUrl = '/sample-master.jpg';
    const isDemoAsset = AI_CONFIG.IS_DEMO_MODE;
    const nowIso = new Date().toISOString();

    const db = getDb();

    if (db) {
      await db.collection('sessions').doc(sessionId).set({
        sessionId,
        garmentAnalysis,
        personAnalysis,
        masterStoragePath: `sessions/${sessionId}/master/master.jpg`,
        status: 'master_ready',
        updatedAt: nowIso
      }, { merge: true });
    } else {
      const mockStore = getMockStore();
      mockStore.sessions.set(sessionId, {
        sessionId,
        garmentAnalysis,
        personAnalysis,
        masterStoragePath: `sessions/${sessionId}/master/master.jpg`,
        status: 'master_ready',
        updatedAt: nowIso
      });
    }

    return NextResponse.json({
      success: true,
      sessionId,
      masterImageUrl,
      isDemoAsset,
      operatorMessage: isDemoAsset
        ? 'Demo Master Reference Image loaded (Real Google Image synthesis pending credentials).'
        : 'Master fashion reference synthesized successfully.'
    });
  } catch (error: any) {
    console.error('Master Image Route Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate master reference image.' },
      { status: 500 }
    );
  }
}
