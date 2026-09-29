import { getApps, getApp, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import crypto from 'crypto';
import { AI_CONFIG } from '../ai/config';

let backendMode: 'REAL_FIREBASE' | 'MOCK_STORE' = 'MOCK_STORE';

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    backendMode = 'REAL_FIREBASE';
    return getApp();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const isValidCredentials = projectId && clientEmail && privateKey && !privateKey.includes('...demo...');

  if (isValidCredentials) {
    try {
      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      backendMode = 'REAL_FIREBASE';
      console.log('🔥 FIREBASE ADMIN INITIALIZED SUCCESSFULLY [REAL FIREBASE MODE]');
      return app;
    } catch (error) {
      console.error('CRITICAL: Firebase Admin initialization error:', error);
    }
  }

  // If real Firebase is missing and mock backend is NOT explicitly allowed, throw error
  if (!AI_CONFIG.ALLOW_MOCK_BACKEND) {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: Real Firebase credentials are missing or invalid, and ALLOW_MOCK_BACKEND is not set to true. Application cannot start in mock mode.'
    );
  }

  backendMode = 'MOCK_STORE';
  console.warn('⚠️ BACKEND MODE: LOCAL MOCK BACKEND STORE (Real Firebase credentials not configured)');
  return null;
}

const firebaseApp = initFirebaseAdmin();

export type MockQueueItem = {
  id: string;
  screenId: string;
  videoId: string;
  sessionId: string;
  videoUrl?: string;
  status: 'queued' | 'reserved' | 'playing' | 'completed' | 'cancelled';
  priority: number;
  repeatCount: number;
  timesPlayed: number;
  createdAt: string;
  reservedAt?: string;
  reservedByScreenId?: string;
  reservationId?: string;
  startedAt?: string;
  completedAt?: string;
};

type MockStore = {
  screens: Map<string, any>;
  liveQueue: Array<MockQueueItem>;
  sessions: Map<string, any>;
  videos: Map<string, any>;
  consents: Map<string, any>;
};

const globalMockStore: MockStore = (global as any).__MAHARAJA_MOCK_STORE__ || {
  screens: new Map([
    ['maharaja-main', {
      id: 'maharaja-main',
      name: 'Maharaja Main Display (Thanjavur)',
      paired: true,
      tokenHash: hashToken('demo-token-123'),
      lastSeenAt: new Date().toISOString()
    }]
  ]),
  liveQueue: [],
  sessions: new Map([
    ['sample-session', {
      id: 'sample-session',
      status: 'completed',
      createdAt: new Date().toISOString()
    }]
  ]),
  videos: new Map([
    ['sample-video', {
      id: 'sample-video',
      sessionId: 'sample-session',
      storagePath: 'sessions/sample-session/video/final.mp4',
      status: 'ready',
      createdAt: new Date().toISOString()
    }]
  ]),
  consents: new Map([
    ['sample-session', {
      sessionId: 'sample-session',
      generationConsent: true,
      publicDisplayConsent: true,
      publicDisplayConsentAt: new Date().toISOString()
    }]
  ])
};

(global as any).__MAHARAJA_MOCK_STORE__ = globalMockStore;

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateDeviceToken(): string {
  return 'mah_dev_' + crypto.randomBytes(24).toString('hex');
}

export function generateReservationId(): string {
  return 'res_' + crypto.randomBytes(16).toString('hex');
}

export function getDb() {
  if (firebaseApp) {
    return getFirestore(firebaseApp);
  }
  return null;
}

export function getStorageBucket() {
  if (firebaseApp && process.env.FIREBASE_STORAGE_BUCKET) {
    return getStorage(firebaseApp).bucket();
  }
  return null;
}

export function getMockStore() {
  return globalMockStore;
}

export const getBackendMode = () => backendMode;
export const isRealFirebaseAvailable = () => !!firebaseApp;

// Server Signed URL Generator (Fix 2 & 8)
export async function getSignedPlaybackUrl(storagePath: string): Promise<string> {
  const bucket = getStorageBucket();
  if (bucket && storagePath) {
    try {
      const file = bucket.file(storagePath);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000 // 15 minutes short-lived URL
      });
      return url;
    } catch (err) {
      console.warn('Failed to generate real GCS signed URL, falling back to asset URL:', err);
    }
  }

  // Fallback / Demo Mode local asset URL
  return '/sample-diwali.mp4';
}
