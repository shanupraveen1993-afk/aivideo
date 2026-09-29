import { NextRequest, NextResponse } from 'next/server';
import { runQualityAssurance } from '@/lib/ai/gemini';
import { AI_CONFIG } from '@/lib/ai/config';
import { getDb, getMockStore } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const sessionId = searchParams.get('sessionId');

    if (!jobId && !sessionId) {
      return NextResponse.json(
        { success: false, error: 'jobId or sessionId parameter is required.' },
        { status: 400 }
      );
    }

    const db = getDb();
    let videoUrl = '/sample-diwali.mp4';
    let status = 'succeeded';
    let targetSessionId = sessionId || 'sample-session';

    if (db) {
      let sessionDoc = null;
      if (sessionId) {
        sessionDoc = await db.collection('sessions').doc(sessionId).get();
      } else if (jobId) {
        const jobDoc = await db.collection('generationJobs').doc(jobId).get();
        if (jobDoc.exists) {
          targetSessionId = jobDoc.data()?.sessionId || targetSessionId;
          sessionDoc = await db.collection('sessions').doc(targetSessionId).get();
        }
      }

      if (sessionDoc && sessionDoc.exists) {
        const data = sessionDoc.data();
        if (data?.videoUrl) {
          videoUrl = data.videoUrl;
        }
        if (data?.videoStatus) {
          status = data.videoStatus;
        }
      }
    } else {
      const mockStore = getMockStore();
      const session = mockStore.sessions.get(targetSessionId);
      if (session && session.videoUrl) {
        videoUrl = session.videoUrl;
      }
    }

    if (!AI_CONFIG.IS_DEMO_MODE && videoUrl === '/sample-diwali.mp4' && !db) {
      return NextResponse.json({
        success: false,
        error: 'Session video is still processing or not found.',
        status: 'processing'
      }, { status: 404 });
    }

    const qaResult = await runQualityAssurance('', videoUrl);

    return NextResponse.json({
      success: true,
      jobId,
      sessionId: targetSessionId,
      status,
      videoUrl,
      videoId: `video_${targetSessionId}`,
      qaResult
    });
  } catch (error: any) {
    console.error('Video Status Route Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve video status.' },
      { status: 500 }
    );
  }
}
