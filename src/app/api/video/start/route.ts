import { NextRequest, NextResponse } from 'next/server';
import { buildVideoPrompt } from '@/lib/ai/gemini';
import { AI_CONFIG } from '@/lib/ai/config';
import { getDb, getMockStore } from '@/lib/firebase/admin';
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

        // Pass approved master image as actual image input to Veo
        if (masterImageUrl && masterImageUrl.startsWith('data:image')) {
          const masterBase64 = masterImageUrl.split(',')[1];
          generateParams.image = {
            inlineData: {
              mimeType: 'image/jpeg',
              data: masterBase64
            }
          };
        }

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
