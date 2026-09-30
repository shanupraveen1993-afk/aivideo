import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore, getStorageBucket } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('sessionId') as string | null;

    if (!file || !sessionId) {
      return NextResponse.json(
        { success: false, error: 'Video file and sessionId are required.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'video/mp4';

    let videoUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    const storagePath = `sessions/${sessionId}/video/final.mp4`;
    const nowIso = new Date().toISOString();

    const bucket = getStorageBucket();
    if (bucket) {
      try {
        const storageFile = bucket.file(storagePath);
        await storageFile.save(buffer, { contentType: mimeType, public: false });
        const [signedUrl] = await storageFile.getSignedUrl({
          action: 'read',
          expires: Date.now() + 24 * 60 * 60 * 1000
        });
        videoUrl = signedUrl;
      } catch (stErr) {
        console.warn('Storage video upload fallback to data URL:', stErr);
      }
    }

    const db = getDb();
    if (db) {
      await db.collection('videos').doc(`video_${sessionId}`).set({
        id: `video_${sessionId}`,
        sessionId,
        storagePath,
        status: 'ready',
        createdAt: nowIso
      }, { merge: true });

      await db.collection('sessions').doc(sessionId).set({
        sessionId,
        videoStatus: 'ready',
        videoUrl,
        videoStoragePath: storagePath,
        updatedAt: nowIso
      }, { merge: true });
    } else {
      const mockStore = getMockStore();
      mockStore.videos.set(`video_${sessionId}`, {
        id: `video_${sessionId}`,
        sessionId,
        storagePath,
        status: 'ready',
        createdAt: nowIso
      });
      const existingSession = mockStore.sessions.get(sessionId) || {};
      mockStore.sessions.set(sessionId, {
        ...existingSession,
        sessionId,
        videoStatus: 'ready',
        videoUrl,
        videoStoragePath: storagePath,
        updatedAt: nowIso
      });
    }

    return NextResponse.json({
      success: true,
      sessionId,
      videoId: `video_${sessionId}`,
      videoUrl,
      message: 'Generated video uploaded successfully.'
    });
  } catch (error: any) {
    console.error('Video Upload Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload video.' },
      { status: 500 }
    );
  }
}
