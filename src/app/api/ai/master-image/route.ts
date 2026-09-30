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
    const { sessionId, garmentAnalysis, personAnalysis, personPhoto, garmentPhotos } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId is required.' }, { status: 400 });
    }

    let masterImageUrl = personPhoto || '/sample-master.jpg';
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

      try {
        const contents: any[] = [];

        // 1. Person photo inlineData (customer reference for facial identity & body proportions)
        if (personPhoto) {
          const personBase64 = personPhoto.split(',')[1] || personPhoto;
          contents.push({
            inlineData: { mimeType: 'image/jpeg', data: personBase64 }
          });
        }

        // 2. Garment photo(s) inlineData (product reference for exact garment, color & embroidery)
        if (garmentPhotos && Array.isArray(garmentPhotos)) {
          garmentPhotos.forEach((photo: string) => {
            const garmentBase64 = photo.split(',')[1] || photo;
            contents.push({
              inlineData: { mimeType: 'image/jpeg', data: garmentBase64 }
            });
          });
        }

        const prompt = `Photorealistic 9:16 vertical full-body fashion master reference image.
Use the first input image for exact facial identity, skin tone, features, and body proportions.
Use the remaining input images for exact product appearance, dress color (${garmentAnalysis?.primaryColor || 'selected outfit'}), fabric, pattern, embroidery, and silhouette (${garmentAnalysis?.garmentType || 'dress'}).
Composite the customer seamlessly wearing the garment as a complete full-length outfit.
Environment: Vibrant decorated Diwali festive background with warm traditional lights, diya lamps, and soft festive bokeh.
Preserve exact face identity, hairstyle, dress color, embroidery details, and head-to-toe full-length framing. Studio lighting, sharp focus, 8k quality.`;

        contents.push(prompt);

        let imageBase64: string | null = null;

        // Multimodal image synthesis passing person & garment reference photo parts with explicit 9:16 aspect ratio
        const genResponse = await ai.models.generateContent({
          model: AI_CONFIG.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
          contents,
          config: {
            imageConfig: {
              aspectRatio: '9:16'
            }
          }
        });

        const candidate = genResponse.candidates?.[0];
        const part = candidate?.content?.parts?.find((p: any) => p.inlineData);
        if (part?.inlineData?.data) {
          imageBase64 = part.inlineData.data;
        }

        if (!imageBase64) {
          throw new Error('Gemini image generation model failed to return a valid master image payload.');
        }

        masterImageUrl = `data:image/jpeg;base64,${imageBase64}`;

        // Store privately in Firebase Storage (public: false)
        const bucket = getStorageBucket();
        if (bucket && imageBase64) {
          const fileBuffer = Buffer.from(imageBase64, 'base64');
          const storagePath = `sessions/${sessionId}/master/master.jpg`;
          const file = bucket.file(storagePath);
          await file.save(fileBuffer, { contentType: 'image/jpeg', public: false });
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
