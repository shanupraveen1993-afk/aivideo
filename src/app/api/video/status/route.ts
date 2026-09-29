import { NextRequest, NextResponse } from 'next/server';
import { runQualityAssurance } from '@/lib/ai/gemini';
import { getDb, getMockStore } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobId parameter is required.' },
        { status: 400 }
      );
    }

    const videoUrl = '/sample-diwali.mp4';
    const qaResult = await runQualityAssurance('', videoUrl);

    return NextResponse.json({
      success: true,
      jobId,
      status: 'succeeded',
      videoUrl,
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
