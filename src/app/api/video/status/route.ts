import { NextRequest, NextResponse } from 'next/server';
import { runQualityAssurance } from '@/lib/ai/gemini';
import { AI_CONFIG } from '@/lib/ai/config';
import { getDb, getMockStore, getStorageBucket } from '@/lib/firebase/admin';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

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
    let jobId = searchParams.get('jobId');
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
      // 1. Fetch Session Doc first (to resolve jobId if only sessionId is provided)
      const sessionDoc = await db.collection('sessions').doc(targetSessionId).get();
      if (sessionDoc.exists) {
        const sData = sessionDoc.data();
        if (sData?.videoUrl) videoUrl = sData.videoUrl;
        if (sData?.videoStatus) status = sData.videoStatus;
        if (!jobId && sData?.jobId) {
          jobId = sData.jobId;
        }
      }

      // 2. Fetch Generation Job Doc to retrieve operationName
      if (jobId) {
        const jobDoc = await db.collection('generationJobs').doc(jobId).get();
        if (jobDoc.exists) {
          operationName = jobDoc.data()?.operationName || null;
          if (!sessionId) {
            targetSessionId = jobDoc.data()?.sessionId || targetSessionId;
          }
        }
      }
    } else {
      const mockStore = getMockStore();
      const session = mockStore.sessions.get(targetSessionId);
      if (session) {
        if (session.videoUrl) videoUrl = session.videoUrl;
        if (session.videoStatus) status = session.videoStatus;
        if (!jobId && session.jobId) jobId = session.jobId;
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

          // Operation complete: download generated MP4 to temp file using official ai.files.download({ file: generatedVideo, downloadPath: tempFilePath })
          const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
          let fileBuffer: Buffer | null = null;

          if (generatedVideo) {
            if (generatedVideo.videoBytes) {
              fileBuffer = Buffer.from(generatedVideo.videoBytes, 'base64');
            } else {
              const tempFileName = `veo_${jobId || targetSessionId}_${Date.now()}.mp4`;
              const tempFilePath = path.join('/tmp', tempFileName);

              try {
                // Official @google/genai SDK file download
                await ai.files.download({
                  file: generatedVideo as any,
                  downloadPath: tempFilePath
                });

                if (fs.existsSync(tempFilePath)) {
                  fileBuffer = fs.readFileSync(tempFilePath);
                  try { fs.unlinkSync(tempFilePath); } catch (_) {}
                } else {
                  console.error('Temp MP4 file was not created at:', tempFilePath);
                }
              } catch (dlErr: any) {
                console.error('ai.files.download error:', dlErr);
                if (fs.existsSync(tempFilePath)) {
                  try { fs.unlinkSync(tempFilePath); } catch (_) {}
                }
              }
            }
          }

          if (!fileBuffer) {
            status = 'failed';
            if (db) {
              await db.collection('sessions').doc(targetSessionId).set({
                videoStatus: 'failed',
                videoError: 'Failed to download generated Veo video output',
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
            return NextResponse.json({
              success: false,
              jobId,
              sessionId: targetSessionId,
              status: 'failed',
              error: 'Veo video download failed.'
            }, { status: 500 });
          }

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
