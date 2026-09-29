import { getStorageBucket, isRealFirebaseAvailable } from './admin';
import { AI_CONFIG } from '../ai/config';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export async function uploadAssetToStorage(
  storagePath: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ storagePath: string; size: number }> {
  // Validate MIME Types
  const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

  if (!isImage && !isVideo) {
    throw new Error(`Unsupported MIME type: ${mimeType}. Allowed: images (JPEG/PNG/WEBP), video (MP4/WEBM).`);
  }

  // Validate File Size Limits
  if (isImage && buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Image file size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 10MB.`);
  }

  if (isVideo && buffer.length > MAX_VIDEO_SIZE) {
    throw new Error(`Video file size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 100MB.`);
  }

  const bucket = getStorageBucket();

  if (bucket && isRealFirebaseAvailable()) {
    const file = bucket.file(storagePath);
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          uploadedAt: new Date().toISOString()
        }
      },
      resumable: false
    });
    return { storagePath, size: buffer.length };
  }

  if (AI_CONFIG.IS_DEMO_MODE || AI_CONFIG.ALLOW_MOCK_BACKEND) {
    console.warn(`[STORAGE MOCK] Simulated upload for path: ${storagePath} (${buffer.length} bytes)`);
    return { storagePath, size: buffer.length };
  }

  throw new Error(`Firebase Storage unavailable and mock backend disabled for path: ${storagePath}`);
}

export async function uploadGarmentImage(sessionId: string, assetId: string, buffer: Buffer, mimeType = 'image/jpeg') {
  const ext = mimeType.split('/')[1] || 'jpg';
  const path = `sessions/${sessionId}/garments/${assetId}.${ext}`;
  return uploadAssetToStorage(path, buffer, mimeType);
}

export async function uploadPersonImage(sessionId: string, assetId: string, buffer: Buffer, mimeType = 'image/jpeg') {
  const ext = mimeType.split('/')[1] || 'jpg';
  const path = `sessions/${sessionId}/person/${assetId}.${ext}`;
  return uploadAssetToStorage(path, buffer, mimeType);
}

export async function uploadMasterImage(sessionId: string, buffer: Buffer, mimeType = 'image/jpeg') {
  const ext = mimeType.split('/')[1] || 'jpg';
  const path = `sessions/${sessionId}/master/master.${ext}`;
  return uploadAssetToStorage(path, buffer, mimeType);
}

export async function uploadFinalVideo(sessionId: string, buffer: Buffer, mimeType = 'video/mp4') {
  const path = `sessions/${sessionId}/video/final.mp4`;
  return uploadAssetToStorage(path, buffer, mimeType);
}
