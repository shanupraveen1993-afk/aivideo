import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore, generateReservationId, getSignedPlaybackUrl, MockQueueItem } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// Separate pre-transaction helper for expired reservation cleanup
async function cleanupExpiredReservations(db: any) {
  try {
    const expiredCutoff = new Date(Date.now() - 30000); // 30s lease timeout
    const expiredSnapshot = await db.collection('liveQueue')
      .where('screenId', '==', 'maharaja-main')
      .where('status', '==', 'reserved')
      .where('reservedAt', '<', expiredCutoff)
      .get();

    if (!expiredSnapshot.empty) {
      const batch = db.batch();
      expiredSnapshot.forEach((doc: any) => {
        batch.update(doc.ref, {
          status: 'queued',
          reservedAt: null,
          reservedByScreenId: null,
          reservationId: null
        });
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('Expired reservation cleanup warning:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const nowIso = new Date().toISOString();

    if (db) {
      // Step A: Expired Reservation Cleanup
      await cleanupExpiredReservations(db);

      // Step B: Transaction to Claim Next Queued Item
      const result = await db.runTransaction(async (transaction: any) => {
        const queueQuery = db.collection('liveQueue')
          .where('screenId', '==', 'maharaja-main')
          .where('status', '==', 'queued')
          .orderBy('createdAt', 'asc')
          .limit(1);

        const queueSnapshot = await transaction.get(queueQuery);
        if (queueSnapshot.empty) {
          return { status: 'idle' };
        }

        const queueDoc = queueSnapshot.docs[0];
        const queueData = queueDoc.data();

        const videoDocRef = db.collection('videos').doc(queueData.videoId);
        const videoDoc = await transaction.get(videoDocRef);

        if (!videoDoc.exists || videoDoc.data()?.status !== 'ready') {
          transaction.update(queueDoc.ref, { status: 'cancelled' });
          return { status: 'idle' };
        }

        const videoData = videoDoc.data();
        const reservationId = generateReservationId();

        transaction.update(queueDoc.ref, {
          status: 'reserved',
          reservedAt: FieldValue.serverTimestamp(),
          reservedByScreenId: 'maharaja-main',
          reservationId
        });

        return {
          status: 'play',
          queueId: queueDoc.id,
          reservationId,
          storagePath: videoData.storagePath
        };
      });

      if (result.status === 'idle') {
        return NextResponse.json({ status: 'idle' });
      }

      const signedUrl = await getSignedPlaybackUrl(result.storagePath);

      return NextResponse.json({
        status: 'play',
        queueId: result.queueId,
        reservationId: result.reservationId,
        videoUrl: signedUrl
      });

    } else {
      // Mock Store Logic for simple demo testing
      const mockStore = getMockStore();

      // Recover expired reservations (>30s)
      mockStore.liveQueue.forEach((item: MockQueueItem) => {
        if (item.status === 'reserved' && item.reservedAt) {
          if (Date.now() - new Date(item.reservedAt).getTime() > 30000) {
            item.status = 'queued';
            delete item.reservedAt;
            delete item.reservationId;
          }
        }
      });

      const nextItem = mockStore.liveQueue.find(
        (item: MockQueueItem) => item.screenId === 'maharaja-main' && item.status === 'queued'
      );

      if (!nextItem) {
        return NextResponse.json({ status: 'idle' });
      }

      const video = mockStore.videos.get(nextItem.videoId);
      if (!video || video.status !== 'ready') {
        nextItem.status = 'cancelled';
        return NextResponse.json({ status: 'idle' });
      }

      const reservationId = generateReservationId();
      nextItem.status = 'reserved';
      nextItem.reservedAt = nowIso;
      nextItem.reservedByScreenId = 'maharaja-main';
      nextItem.reservationId = reservationId;

      const signedUrl = await getSignedPlaybackUrl(video.storagePath);

      return NextResponse.json({
        status: 'play',
        queueId: nextItem.id,
        reservationId,
        videoUrl: signedUrl
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
