import { NextRequest, NextResponse } from 'next/server';
import { buildVideoPrompt } from '@/lib/ai/gemini';
import { getDb, getMockStore } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, garmentAnalysis } = body;

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const prompt = buildVideoPrompt(garmentAnalysis);
    const nowIso = new Date().toISOString();

    const jobData = {
      id: jobId,
      sessionId,
      prompt,
      provider: 'google-veo',
      model: process.env.GEMINI_VIDEO_MODEL || 'veo-3.1-generate-preview',
      status: 'processing',
      createdAt: nowIso
    };

    const db = getDb();
    if (db) {
      await db.collection('generationJobs').doc(jobId).set(jobData);
    } else {
      const mockStore = getMockStore();
      mockStore.sessions.set(`job_${jobId}`, jobData);
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: 'processing',
      message: 'Video generation job started.'
    });
  } catch (error: any) {
    console.error('Video Start Route Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start video generation job.' },
      { status: 500 }
    );
  }
}
