import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { queueId, reservationId, reason = 'Browser playback error' } = body;

    if (!queueId || !reservationId) {
      return NextResponse.json({ success: false, error: 'Missing queueId or reservationId' }, { status: 400 });
    }

    const db = getDb();
    const nowIso = new Date().toISOString();

    if (db) {
      const queueDocRef = db.collection('liveQueue').doc(queueId);
      const doc = await queueDocRef.get();
      if (!doc.exists || doc.data()?.reservationId !== reservationId) {
        return NextResponse.json({ success: false, error: 'Invalid or expired reservationId' }, { status: 400 });
      }

      await queueDocRef.update({
        status: 'playback_failed',
        failureReason: reason,
        failedAt: nowIso
      });
    } else {
      const mockStore = getMockStore();
      const item = mockStore.liveQueue.find((i) => i.id === queueId && i.reservationId === reservationId);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Invalid or expired reservationId' }, { status: 400 });
      }
      item.status = 'playback_failed';
      (item as any).failureReason = reason;
      (item as any).failedAt = nowIso;
    }

    return NextResponse.json({ success: true, status: 'playback_failed' });
  } catch (error: any) {
    console.error('API Live Fail Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
