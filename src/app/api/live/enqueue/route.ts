import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, videoId } = body;

    if (!sessionId || !videoId) {
      return NextResponse.json(
        { success: false, error: 'sessionId and videoId parameters are required.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const nowIso = new Date().toISOString();

    if (db) {
      // 1. Verify session exists
      const sessionDoc = await db.collection('sessions').doc(sessionId).get();
      if (!sessionDoc.exists) {
        return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
      }

      // 2. Verify video exists and belongs to session
      const videoDoc = await db.collection('videos').doc(videoId).get();
      if (!videoDoc.exists || videoDoc.data()?.sessionId !== sessionId) {
        return NextResponse.json({ success: false, error: 'Video not found for this session.' }, { status: 404 });
      }

      // 3. Verify video status is ready
      if (videoDoc.data()?.status !== 'ready') {
        return NextResponse.json({ success: false, error: 'Video is not in ready status.' }, { status: 400 });
      }

      // 4. Verify public display consent in consents collection (Fix 3)
      const consentDoc = await db.collection('consents').doc(sessionId).get();
      if (!consentDoc.exists || consentDoc.data()?.publicDisplayConsent !== true) {
        return NextResponse.json(
          { success: false, error: 'Public display consent has not been recorded for this session.' },
          { status: 403 }
        );
      }

      // 5. Verify target screen is active
      const screenDoc = await db.collection('screens').doc('maharaja-main').get();
      if (!screenDoc.exists || !screenDoc.data()?.paired) {
        return NextResponse.json({ success: false, error: 'Target screen is not active.' }, { status: 400 });
      }

      const queueId = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const queueItem = {
        id: queueId,
        screenId: 'maharaja-main',
        videoId,
        sessionId,
        status: 'queued' as const,
        priority: 1,
        repeatCount: 1,
        timesPlayed: 0,
        createdAt: nowIso
      };

      await db.collection('liveQueue').doc(queueId).set(queueItem);

      return NextResponse.json({
        success: true,
        queueId,
        message: 'Your Maharaja Diwali moment has been added to the big screen.'
      });

    } else {
      // Mock Store Logic
      const mockStore = getMockStore();
      const session = mockStore.sessions.get(sessionId);
      const video = mockStore.videos.get(videoId);
      const consent = mockStore.consents.get(sessionId);
      const screen = mockStore.screens.get('maharaja-main');

      if (!session) {
        return NextResponse.json({ success: false, error: 'Session not found.' }, { status: 404 });
      }

      if (!video || video.sessionId !== sessionId) {
        return NextResponse.json({ success: false, error: 'Video not found for this session.' }, { status: 404 });
      }

      if (video.status !== 'ready') {
        return NextResponse.json({ success: false, error: 'Video is not in ready status.' }, { status: 400 });
      }

      if (!consent || consent.publicDisplayConsent !== true) {
        return NextResponse.json(
          { success: false, error: 'Public display consent has not been recorded for this session.' },
          { status: 403 }
        );
      }

      if (!screen || !screen.paired) {
        return NextResponse.json({ success: false, error: 'Target screen is not active.' }, { status: 400 });
      }

      const queueId = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const queueItem = {
        id: queueId,
        screenId: 'maharaja-main',
        videoId,
        sessionId,
        status: 'queued' as const,
        priority: 1,
        repeatCount: 1,
        timesPlayed: 0,
        createdAt: nowIso
      };

      mockStore.liveQueue.push(queueItem);

      return NextResponse.json({
        success: true,
        queueId,
        message: 'Your Maharaja Diwali moment has been added to the big screen.'
      });
    }
  } catch (error: any) {
    console.error('Enqueue Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
