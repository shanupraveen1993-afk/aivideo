import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId = 'sample-session', videoId = 'sample-video', videoUrl, publicDisplayConsent = true } = body;

    if (!publicDisplayConsent) {
      return NextResponse.json(
        { success: false, error: 'Public display consent is required for Go Live.' },
        { status: 400 }
      );
    }

    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Default sample URL if not explicitly provided
    const targetVideoUrl = videoUrl || '/sample-diwali.mp4';

    const queueItem = {
      id: queueId,
      screenId: 'maharaja-main',
      videoId,
      sessionId,
      videoUrl: targetVideoUrl,
      status: 'queued' as const,
      priority: 1,
      repeatCount: 1,
      timesPlayed: 0,
      createdAt: now
    };

    const db = getDb();
    if (db) {
      await db.collection('liveQueue').doc(queueId).set(queueItem);
    } else {
      const mockStore = getMockStore();
      mockStore.liveQueue.push(queueItem);
    }

    return NextResponse.json({
      success: true,
      queueId,
      message: "Your Maharaja Diwali moment has been added to the big screen."
    });
  } catch (error: any) {
    console.error('Enqueue Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
