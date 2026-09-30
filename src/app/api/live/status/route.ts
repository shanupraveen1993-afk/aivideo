import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queueId = searchParams.get('queueId');

    if (!queueId) {
      return NextResponse.json(
        { success: false, error: 'queueId parameter is required.' },
        { status: 400 }
      );
    }

    const db = getDb();

    if (db) {
      const docRef = db.collection('liveQueue').doc(queueId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return NextResponse.json(
          { success: false, error: 'Queue item not found.' },
          { status: 404 }
        );
      }

      const data = docSnap.data() || {};
      return NextResponse.json({
        success: true,
        queueId,
        status: data.status || 'queued',
        playAtMs: data.playAtMs || null,
        reservedAt: data.reservedAt || null,
        startedAt: data.startedAt || null,
        completedAt: data.completedAt || null
      });

    } else {
      const mockStore = getMockStore();
      const item = mockStore.liveQueue.find((q: any) => q.id === queueId);

      if (!item) {
        return NextResponse.json(
          { success: false, error: 'Queue item not found.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        queueId,
        status: item.status || 'queued',
        playAtMs: item.playAtMs || null
      });
    }
  } catch (error: any) {
    console.error('API Live Status Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
