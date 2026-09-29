import { getApps, getApp, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

// Server-side initialization check
function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  // If real credentials are valid and non-placeholder
  if (projectId && clientEmail && privateKey && !privateKey.includes('...demo...')) {
    try {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    } catch (error) {
      console.warn('Firebase Admin init failed, falling back to mock mode:', error);
    }
  }

  return null;
}

const firebaseApp = initFirebaseAdmin();

// In-memory mock store for local development before live GCP credentials are unit-tested
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
  sessions: new Map(),
  videos: new Map()
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

// Server API Database Access
export function getDb() {
  if (firebaseApp) {
    return getFirestore(firebaseApp);
  }
  return null;
}

export function getMockStore() {
  return globalMockStore;
}

export const isRealFirebaseAvailable = () => !!firebaseApp;
