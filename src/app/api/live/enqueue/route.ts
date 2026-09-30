import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId = 'sample-session', videoId = 'sample-video' } = body;

    const queueId = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const playAtMs = nowMs + 5000;
    const playAtTimestamp = Timestamp.fromMillis(playAtMs);
    const playAtIso = new Date(playAtMs).toISOString();

    const queueItem = {
      id: queueId,
      screenId: 'maharaja-main',
      videoId,
      sessionId,
      status: 'queued' as const,
      priority: 1,
      repeatCount: 1,
      timesPlayed: 0,
      createdAt: nowIso,
      playAt: playAtTimestamp,
      playAtIso,
      playAtMs
    };

    const db = getDb();
    if (db) {
      await db.collection('liveQueue').doc(queueId).set(queueItem);
    } else {
      const mockStore = getMockStore();
      mockStore.liveQueue.push({
        ...queueItem,
        playAt: playAtIso
      });
    }

    return NextResponse.json({
      success: true,
      queueId,
      playAt: playAtIso,
      message: 'Your Maharaja Diwali moment has been added to the big screen.'
    });
  } catch (error: any) {
    console.error('Enqueue Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
