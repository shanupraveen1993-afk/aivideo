import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { queueId, reservationId } = body;

    if (!queueId) {
      return NextResponse.json({ success: false, error: 'Missing queueId' }, { status: 400 });
    }

    const db = getDb();
    const nowIso = new Date().toISOString();

    if (db) {
      const queueDocRef = db.collection('liveQueue').doc(queueId);
      await queueDocRef.update({
        status: 'completed',
        completedAt: nowIso,
        timesPlayed: 1
      });
    } else {
      const mockStore = getMockStore();
      const item = mockStore.liveQueue.find((i) => i.id === queueId);
      if (item) {
        item.status = 'completed';
        item.completedAt = nowIso;
        item.timesPlayed = (item.timesPlayed || 0) + 1;
      }
    }

    return NextResponse.json({ success: true, status: 'completed' });
  } catch (error: any) {
    console.error('API Live Complete Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
