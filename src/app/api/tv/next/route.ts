import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore, hashToken, generateReservationId, MockQueueItem } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized TV Request' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const tokenHash = hashToken(token);
    const db = getDb();
    const now = new Date();
    const nowIso = now.toISOString();

    if (db) {
      // Validate device token in Firestore
      const screenDoc = await db.collection('screens').doc('maharaja-main').get();
      if (!screenDoc.exists || screenDoc.data()?.tokenHash !== tokenHash) {
        return NextResponse.json(
          { success: false, error: 'Invalid TV Device Token' },
          { status: 403 }
        );
      }

      // Update screen heartbeat
      await db.collection('screens').doc('maharaja-main').update({ lastSeenAt: nowIso });

      // Run Transaction to atomically reserve next queue item
      const result = await db.runTransaction(async (transaction: any) => {
        // Step A: Recover expired reservations (>30 seconds old)
        const expiredSnapshot = await transaction.get(
          db.collection('liveQueue')
            .where('screenId', '==', 'maharaja-main')
            .where('status', '==', 'reserved')
        );

        expiredSnapshot.forEach((doc: any) => {
          const data = doc.data();
          if (data.reservedAt) {
            const reservedTime = new Date(data.reservedAt).getTime();
            if (now.getTime() - reservedTime > 30000) {
              transaction.update(doc.ref, {
                status: 'queued',
                reservedAt: null,
                reservedByScreenId: null,
                reservationId: null
              });
            }
          }
        });

        // Step B: Find oldest queued item
        const queueSnapshot = await transaction.get(
          db.collection('liveQueue')
            .where('screenId', '==', 'maharaja-main')
            .where('status', '==', 'queued')
            .orderBy('createdAt', 'asc')
            .limit(1)
        );

        if (queueSnapshot.empty) {
          return { status: 'idle' };
        }

        const nextDoc = queueSnapshot.docs[0];
        const nextData = nextDoc.data();
        const reservationId = generateReservationId();

        transaction.update(nextDoc.ref, {
          status: 'reserved',
          reservedAt: nowIso,
          reservedByScreenId: 'maharaja-main',
          reservationId
        });

        return {
          status: 'play',
          queueId: nextDoc.id,
          reservationId,
          videoUrl: nextData.videoUrl || '/sample-diwali.mp4'
        };
      });

      return NextResponse.json(result);
    } else {
      // Mock Store Logic
      const mockStore = getMockStore();
      const screen = mockStore.screens.get('maharaja-main');

      if (!screen || screen.tokenHash !== tokenHash) {
        return NextResponse.json(
          { success: false, error: 'Invalid TV Device Token' },
          { status: 403 }
        );
      }

      screen.lastSeenAt = nowIso;

      // Recover expired reservations (>30 seconds)
      mockStore.liveQueue.forEach((item: MockQueueItem) => {
        if (item.status === 'reserved' && item.reservedAt) {
          if (now.getTime() - new Date(item.reservedAt).getTime() > 30000) {
            item.status = 'queued';
            delete item.reservedAt;
            delete item.reservationId;
          }
        }
      });

      // Find first queued item
      const nextItem = mockStore.liveQueue.find(
        (item: MockQueueItem) => item.screenId === 'maharaja-main' && item.status === 'queued'
      );

      if (!nextItem) {
        return NextResponse.json({ status: 'idle' });
      }

      const reservationId = generateReservationId();
      nextItem.status = 'reserved';
      nextItem.reservedAt = nowIso;
      nextItem.reservedByScreenId = 'maharaja-main';
      nextItem.reservationId = reservationId;

      return NextResponse.json({
        status: 'play',
        queueId: nextItem.id,
        reservationId,
        videoUrl: nextItem.videoUrl || '/sample-diwali.mp4'
      });
    }
  } catch (error: any) {
    console.error('TV Next API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
