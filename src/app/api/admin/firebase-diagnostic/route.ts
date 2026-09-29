import { NextRequest, NextResponse } from 'next/server';
import { getDb, getStorageBucket, isRealFirebaseAvailable, getBackendMode } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/auth/admin';

export async function GET(req: NextRequest) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized Admin Session' }, { status: 401 });
  }

  let firestoreStatus = 'NOT_TESTED';
  let storageStatus = 'NOT_TESTED';
  let diagnosticError: string | null = null;

  try {
    const db = getDb();
    if (db && isRealFirebaseAvailable()) {
      // 1. Test Firestore Read/Write
      const testDocRef = db.collection('_diagnostics').doc(`test_${Date.now()}`);
      await testDocRef.set({ test: true, timestamp: new Date().toISOString() });
      const docSnap = await testDocRef.get();
      if (docSnap.exists && docSnap.data()?.test === true) {
        firestoreStatus = 'OK';
      }
      await testDocRef.delete(); // Cleanup test doc
    } else {
      firestoreStatus = 'MOCK_STORE_ACTIVE';
    }

    // 2. Test Firebase Storage Connection
    const bucket = getStorageBucket();
    if (bucket && isRealFirebaseAvailable()) {
      const [exists] = await bucket.exists();
      if (exists) {
        storageStatus = 'OK';
      } else {
        storageStatus = 'BUCKET_NOT_FOUND';
      }
    } else {
      storageStatus = 'MOCK_STORAGE_ACTIVE';
    }
  } catch (err: any) {
    console.error('Firebase Diagnostic Error:', err);
    diagnosticError = err.message || 'Diagnostic failed';
  }

  return NextResponse.json({
    success: true,
    backendMode: getBackendMode(),
    realFirebaseAvailable: isRealFirebaseAvailable(),
    diagnostics: {
      FIRESTORE_CONNECTION: firestoreStatus,
      STORAGE_CONNECTION: storageStatus,
      error: diagnosticError
    }
  });
}
