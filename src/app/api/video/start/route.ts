import { NextRequest, NextResponse } from 'next/server';
import { buildVideoPrompt } from '@/lib/ai/gemini';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, garmentAnalysis, masterImageUrl } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const prompt = buildVideoPrompt(garmentAnalysis);
    const nowIso = new Date().toISOString();

    let operationName: string | null = null;
    let videoUrl = '/sample-diwali.mp4';

    if (!AI_CONFIG.IS_DEMO_MODE) {
      const ai = getGenAIClient();
      if (!ai) {
        return NextResponse.json(
          { success: false, error: 'Gemini API key is not configured for Veo video generation.' },
          { status: 500 }
        );
      }

      try {
        const videoConfig: any = {
          aspectRatio: '9:16',
          numberOfVideos: 1,
          durationSeconds: 6,
          resolution: '720p'
        };

        const generateParams: any = {
          model: AI_CONFIG.GEMINI_VIDEO_MODEL || 'veo-3.1-generate-preview',
          prompt,
          config: videoConfig
        };

        // Pass approved master image as actual image input to Veo (dataUrl, Storage path, or signed URL)
        let masterBase64: string | null = null;

        if (masterImageUrl && masterImageUrl.startsWith('data:image')) {
          masterBase64 = masterImageUrl.split(',')[1];
        } else {
          // Attempt read from Firebase Storage
          const bucket = getStorageBucket();
          if (bucket) {
            try {
              const storagePath = `sessions/${sessionId}/master/master.jpg`;
              const [buffer] = await bucket.file(storagePath).download();
              masterBase64 = buffer.toString('base64');
            } catch (stErr) {
              console.warn('Storage master image download warning:', stErr);
            }
          }

          // Fallback fetch signed URL if storage download didn't return
          if (!masterBase64 && masterImageUrl && masterImageUrl.startsWith('http')) {
            try {
              const fetchRes = await fetch(masterImageUrl);
              if (fetchRes.ok) {
                const buffer = Buffer.from(await fetchRes.arrayBuffer());
                masterBase64 = buffer.toString('base64');
              }
            } catch (netErr) {
              console.warn('Signed URL fetch fallback error:', netErr);
            }
          }
        }

        if (!masterBase64) {
          return NextResponse.json(
            { success: false, error: 'Approved master reference image bytes are required to initialize Veo generation.' },
            { status: 400 }
          );
        }

        generateParams.image = {
          imageBytes: masterBase64,
          mimeType: 'image/jpeg'
        };

        const videoResponse = await ai.models.generateVideos(generateParams);
        operationName = videoResponse.name || null;
      } catch (veoError: any) {
        console.error('Veo Video Start Error:', veoError);
        return NextResponse.json(
          { success: false, error: `Veo video generation failed to start: ${veoError.message}` },
          { status: 500 }
        );
      }
    }

    const jobData = {
      id: jobId,
      sessionId,
      prompt,
      operationName,
      provider: 'google-veo',
      model: AI_CONFIG.GEMINI_VIDEO_MODEL || 'veo-3.1-generate-preview',
      status: AI_CONFIG.IS_DEMO_MODE ? 'succeeded' : 'processing',
      videoUrl: AI_CONFIG.IS_DEMO_MODE ? videoUrl : null,
      createdAt: nowIso
    };

    const db = getDb();
    if (db) {
      await db.collection('generationJobs').doc(jobId).set(jobData);
      await db.collection('sessions').doc(sessionId).set({
        sessionId,
        jobId,
        videoStatus: jobData.status,
        updatedAt: nowIso
      }, { merge: true });
    } else {
      const mockStore = getMockStore();
      mockStore.sessions.set(`job_${jobId}`, jobData);
      const existingSession = mockStore.sessions.get(sessionId) || {};
      mockStore.sessions.set(sessionId, {
        ...existingSession,
        sessionId,
        jobId,
        videoStatus: jobData.status,
        updatedAt: nowIso
      });
    }

    return NextResponse.json({
      success: true,
      jobId,
      sessionId,
      status: jobData.status,
      message: 'Video generation job initialized.'
    });
  } catch (error: any) {
    console.error('Video Start Route Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start video generation job.' },
      { status: 500 }
    );
  }
}
