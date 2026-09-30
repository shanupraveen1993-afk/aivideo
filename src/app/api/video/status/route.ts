import { NextRequest, NextResponse } from 'next/server';
import { runQualityAssurance } from '@/lib/ai/gemini';
import { AI_CONFIG } from '@/lib/ai/config';
import { getDb, getMockStore, getStorageBucket } from '@/lib/firebase/admin';
import { GoogleGenAI } from '@google/genai';

function getGenAIClient() {
  const apiKey = AI_CONFIG.PRIMARY_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch (err) {
    return null;
  }
}

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
    let videoUrl = AI_CONFIG.IS_DEMO_MODE ? '/sample-diwali.mp4' : null;
    let status = AI_CONFIG.IS_DEMO_MODE ? 'ready' : 'processing';
    let targetSessionId = sessionId || 'sample-session';
    let operationName: string | null = null;

    if (db) {
      let sessionDoc = null;
      let jobDoc = null;

      if (jobId) {
        jobDoc = await db.collection('generationJobs').doc(jobId).get();
        if (jobDoc.exists) {
          operationName = jobDoc.data()?.operationName || null;
          targetSessionId = jobDoc.data()?.sessionId || targetSessionId;
        }
      }

      sessionDoc = await db.collection('sessions').doc(targetSessionId).get();
      if (sessionDoc.exists) {
        const data = sessionDoc.data();
        if (data?.videoUrl) videoUrl = data.videoUrl;
        if (data?.videoStatus) status = data.videoStatus;
      }
    } else {
      const mockStore = getMockStore();
      const session = mockStore.sessions.get(targetSessionId);
      if (session && session.videoUrl) {
        videoUrl = session.videoUrl;
        status = session.videoStatus || 'ready';
      }
    }

    // Real Veo Operation Polling via Google operations API
    if (!AI_CONFIG.IS_DEMO_MODE && operationName && status === 'processing') {
      const ai = getGenAIClient();
      if (ai) {
        try {
          const operation: any = await (ai.operations as any).getVideosOperation({
            operation: { name: operationName }
          });

          if (!operation.done) {
            return NextResponse.json({
              success: true,
              jobId,
              sessionId: targetSessionId,
              status: 'processing',
              message: 'Veo video rendering in progress...'
            });
          }

          // Operation complete: extract generated MP4 using official ai.files.download() or buffer fallback
          const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
          let fileBuffer: Buffer | null = null;

          if (generatedVideo) {
            if (generatedVideo.videoBytes) {
              fileBuffer = Buffer.from(generatedVideo.videoBytes, 'base64');
            } else {
              try {
                const videoRef = generatedVideo.name || generatedVideo.uri || generatedVideo;
                const fileResponse = await (ai.files as any).download({ file: videoRef });
                const arrayBuf = await fileResponse.arrayBuffer();
                fileBuffer = Buffer.from(arrayBuf);
              } catch (dlErr) {
                console.warn('ai.files.download fallback error:', dlErr);
                if (generatedVideo.uri && generatedVideo.uri.startsWith('http')) {
                  const fetchRes = await fetch(generatedVideo.uri);
                  fileBuffer = Buffer.from(await fetchRes.arrayBuffer());
                }
              }
            }
          }

          if (fileBuffer) {
            const storagePath = `sessions/${targetSessionId}/video/final.mp4`;

            const bucket = getStorageBucket();
            if (bucket) {
              const file = bucket.file(storagePath);
              await file.save(fileBuffer, { contentType: 'video/mp4', public: false });
              const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
              videoUrl = signedUrl;
            } else {
              videoUrl = `data:video/mp4;base64,${fileBuffer.toString('base64')}`;
            }

            status = 'ready';

            // Store in Firestore: videos/video_{sessionId} and update session
            if (db) {
              await db.collection('videos').doc(`video_${targetSessionId}`).set({
                id: `video_${targetSessionId}`,
                sessionId: targetSessionId,
                storagePath: `sessions/${targetSessionId}/video/final.mp4`,
                status: 'ready',
                createdAt: new Date().toISOString()
              }, { merge: true });

              await db.collection('sessions').doc(targetSessionId).set({
                videoStatus: 'ready',
                videoUrl,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            } else {
              const mockStore = getMockStore();
              mockStore.videos.set(`video_${targetSessionId}`, {
                id: `video_${targetSessionId}`,
                sessionId: targetSessionId,
                storagePath: `sessions/${targetSessionId}/video/final.mp4`,
                status: 'ready',
                createdAt: new Date().toISOString()
              });
            }
          }
        } catch (opErr: any) {
          console.error('Veo Operation Polling Error:', opErr);
        }
      }
    }

    if (!AI_CONFIG.IS_DEMO_MODE && !videoUrl && status !== 'ready') {
      return NextResponse.json({
        success: true,
        jobId,
        sessionId: targetSessionId,
        status: 'processing',
        message: 'Video rendering in progress...'
      });
    }

    const qaResult = await runQualityAssurance('', videoUrl || '');

    return NextResponse.json({
      success: true,
      jobId,
      sessionId: targetSessionId,
      status: status === 'ready' || status === 'succeeded' ? 'ready' : 'processing',
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
