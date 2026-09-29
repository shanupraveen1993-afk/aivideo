import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore, hashToken, generateReservationId, getSignedPlaybackUrl, MockQueueItem } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// Separate helper for expired reservation cleanup (STEP A)
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
    const nowIso = new Date().toISOString();

    if (db) {
      // Validate device token in Firestore
      const screenDoc = await db.collection('screens').doc('maharaja-main').get();
      if (!screenDoc.exists || screenDoc.data()?.tokenHash !== tokenHash) {
        return NextResponse.json(
          { success: false, error: 'Invalid TV Device Token' },
          { status: 403 }
        );
      }

      await db.collection('screens').doc('maharaja-main').update({ lastSeenAt: nowIso });

      // STEP A: Separate Expired Reservation Cleanup
      await cleanupExpiredReservations(db);

      // STEP B: Transaction (Strict Order: ALL READS FIRST, THEN WRITES)
      const result = await db.runTransaction(async (transaction: any) => {
        // READ 1: Query next queued item
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

        // READ 2: Query referenced videos document server-side
        const videoDocRef = db.collection('videos').doc(queueData.videoId);
        const videoDoc = await transaction.get(videoDocRef);

        if (!videoDoc.exists || videoDoc.data()?.status !== 'ready') {
          // If video isn't ready, mark queue item cancelled
          transaction.update(queueDoc.ref, { status: 'cancelled' });
          return { status: 'idle' };
        }

        const videoData = videoDoc.data();
        const reservationId = generateReservationId();

        // WRITE: Update queued -> reserved (ALL READS COMPLETED BEFORE THIS WRITE)
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

      // Generate short-lived signed URL server-side (Fix 2)
      const signedUrl = await getSignedPlaybackUrl(result.storagePath);

      return NextResponse.json({
        status: 'play',
        queueId: result.queueId,
        reservationId: result.reservationId,
        videoUrl: signedUrl
      });

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

      // Find first queued item
      const nextItem = mockStore.liveQueue.find(
        (item: MockQueueItem) => item.screenId === 'maharaja-main' && item.status === 'queued'
      );

      if (!nextItem) {
        return NextResponse.json({ status: 'idle' });
      }

      // Find referenced video in mock store
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
