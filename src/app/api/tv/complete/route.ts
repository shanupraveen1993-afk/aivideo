import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore, hashToken } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const tokenHash = hashToken(token);
    const body = await req.json();
    const { queueId, reservationId } = body;

    if (!queueId || !reservationId) {
      return NextResponse.json({ success: false, error: 'Missing queueId or reservationId' }, { status: 400 });
    }

    const db = getDb();
    const nowIso = new Date().toISOString();

    if (db) {
      const screenDoc = await db.collection('screens').doc('maharaja-main').get();
      if (!screenDoc.exists || screenDoc.data()?.tokenHash !== tokenHash) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      const queueDocRef = db.collection('liveQueue').doc(queueId);
      const queueDoc = await queueDocRef.get();

      if (!queueDoc.exists || queueDoc.data()?.reservationId !== reservationId) {
        return NextResponse.json({ success: false, error: 'Invalid reservation' }, { status: 400 });
      }

      await queueDocRef.update({
        status: 'completed',
        completedAt: nowIso,
        timesPlayed: (queueDoc.data()?.timesPlayed || 0) + 1
      });
    } else {
      const mockStore = getMockStore();
      const screen = mockStore.screens.get('maharaja-main');
      if (!screen || screen.tokenHash !== tokenHash) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      const item = mockStore.liveQueue.find((i) => i.id === queueId && i.reservationId === reservationId);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Invalid reservation' }, { status: 400 });
      }

      item.status = 'completed';
      item.completedAt = nowIso;
      item.timesPlayed = (item.timesPlayed || 0) + 1;
    }

    return NextResponse.json({ success: true, status: 'completed' });
  } catch (error: any) {
    console.error('TV Complete Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
