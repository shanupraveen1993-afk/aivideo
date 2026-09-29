import { NextRequest, NextResponse } from 'next/server';
import { getDb, getMockStore, getStorageBucket } from '@/lib/firebase/admin';
import { AI_CONFIG } from '@/lib/ai/config';
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
    const { sessionId, garmentAnalysis, personAnalysis } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required.' }, { status: 400 });
    }

    let masterImageUrl = '/sample-master.jpg';
    const isDemoAsset = AI_CONFIG.IS_DEMO_MODE;
    const nowIso = new Date().toISOString();

    const ai = getGenAIClient();

    if (!isDemoAsset) {
      if (!ai) {
        return NextResponse.json(
          { success: false, error: 'Gemini API key is not configured for master image synthesis.' },
          { status: 500 }
        );
      }

      const prompt = `Vertical 9:16 photorealistic fashion master reference photograph of a person wearing a ${garmentAnalysis?.primaryColor || 'maroon'} ${garmentAnalysis?.garmentType || 'Kurta'} with ${garmentAnalysis?.embroideryDescription || 'intricate gold zari embroidery'}, paired with ${garmentAnalysis?.complementaryPieces?.recommendedBottom || 'churidar'}. Diwali festive royal palace background, warm lighting, 8k resolution, crisp facial detail.`;

      try {
        const imagenResponse = await ai.models.generateImages({
          model: AI_CONFIG.GEMINI_IMAGE_MODEL || 'imagen-3.0-generate-002',
          prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '9:16'
          }
        });

        const generatedImage = imagenResponse.generatedImages?.[0];
        if (!generatedImage || !generatedImage.image?.imageBytes) {
          throw new Error('Imagen returned an empty image payload');
        }

        masterImageUrl = `data:image/jpeg;base64,${generatedImage.image.imageBytes}`;

        // Attempt upload to Firebase Storage if bucket is available
        const bucket = getStorageBucket();
        if (bucket) {
          const fileBuffer = Buffer.from(generatedImage.image.imageBytes, 'base64');
          const storagePath = `sessions/${sessionId}/master/master.jpg`;
          const file = bucket.file(storagePath);
          await file.save(fileBuffer, { contentType: 'image/jpeg', public: true });
          const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
          masterImageUrl = signedUrl;
        }
      } catch (genError: any) {
        console.error('Gemini Master Image Generation Failed:', genError);
        return NextResponse.json(
          { success: false, error: `Master Image generation failed: ${genError.message}` },
          { status: 500 }
        );
      }
    }

    const db = getDb();

    if (db) {
      await db.collection('sessions').doc(sessionId).set({
        sessionId,
        garmentAnalysis,
        personAnalysis,
        masterImageUrl,
        masterStoragePath: `sessions/${sessionId}/master/master.jpg`,
        status: 'master_ready',
        updatedAt: nowIso
      }, { merge: true });
    } else {
      const mockStore = getMockStore();
      mockStore.sessions.set(sessionId, {
        sessionId,
        garmentAnalysis,
        personAnalysis,
        masterImageUrl,
        masterStoragePath: `sessions/${sessionId}/master/master.jpg`,
        status: 'master_ready',
        updatedAt: nowIso
      });
    }

    return NextResponse.json({
      success: true,
      sessionId,
      masterImageUrl,
      isDemoAsset,
      operatorMessage: isDemoAsset
        ? 'Demo Master Reference Image loaded (Real Google Image synthesis active when DEMO_MODE=false).'
        : 'Master fashion reference synthesized successfully.'
    });
  } catch (error: any) {
    console.error('Master Image Route Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate master reference image.' },
      { status: 500 }
    );
  }
}
