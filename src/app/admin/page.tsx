'use client';

import React, { useState, useEffect } from 'react';
import { Tv, Play, CheckCircle, RefreshCw, AlertCircle, Sparkles, ShieldCheck, Lock, LogOut } from 'lucide-react';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [isEnqueuing, setIsEnqueuing] = useState(false);
  const [enqueueStatus, setEnqueueStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setLoginError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setLoginError('Connection error during login');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  const handleGoLiveSample = async () => {
    setIsEnqueuing(true);
    setEnqueueStatus(null);

    try {
      const res = await fetch('/api/live/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'sample-session',
          videoId: 'sample-video'
        })
      });

      const data = await res.json();

      if (data.success) {
        setEnqueueStatus({
          type: 'success',
          message: `Success! Sample video enqueued to Maharaja Main Display (Queue ID: ${data.queueId})`
        });
      } else {
        setEnqueueStatus({
          type: 'error',
          message: data.error || 'Failed to enqueue sample video'
        });
      }
    } catch (err: any) {
      setEnqueueStatus({
        type: 'error',
        message: 'Network error triggering Go Live'
      });
    } finally {
      setIsEnqueuing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070609] p-6 font-sans">
        <div className="max-w-md w-full maharaja-card p-8 rounded-2xl border border-[#D4AF37]/30 text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#6e0d1f]/40 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
            <Lock className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-serif font-bold text-[#F3E5AB] tracking-wider uppercase mb-1">
            MAHARAJA ADMIN LOGIN
          </h1>
          <p className="text-xs text-[#D4AF37]/70 uppercase tracking-widest mb-6">
            Store Operations & Systems Control
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter Admin Password"
                className="w-full text-center text-lg py-3 px-4 rounded-xl bg-black/60 border border-[#D4AF37]/40 text-[#F3E5AB] focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>

            {loginError && (
              <p className="text-red-400 text-xs bg-red-950/40 p-2 rounded border border-red-800/40">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-semibold uppercase tracking-wider text-sm shadow-lg hover:brightness-110 transition"
            >
              AUTHENTICATE ADMIN
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070609] text-[#F8F5EE] p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D4AF37]/20 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#D4AF37]">
              <ShieldCheck className="w-4 h-4" /> STORE MANAGEMENT CONTROL PANEL
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#F3E5AB] tracking-wide mt-1">
              MAHARAJA THANJAVUR — ADMIN
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-300 text-xs font-semibold uppercase tracking-wider hover:bg-gray-800 transition flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> LOGOUT
            </button>
          </div>
        </div>

        {/* Phase 2 Verification Card */}
        <div className="maharaja-card p-8 rounded-2xl border border-[#D4AF37]/40 relative overflow-hidden">
          <div className="flex items-center gap-3 text-[#D4AF37] mb-2 font-mono text-xs uppercase tracking-widest">
            <Sparkles className="w-4 h-4" /> FOUNDATION & GO LIVE SYSTEM VERIFICATION
          </div>

          <h2 className="text-2xl font-serif font-bold text-[#F3E5AB] mb-3">
            Test In-Store Display Broadcast
          </h2>

          <p className="text-sm text-gray-300 mb-6 leading-relaxed max-w-2xl">
            Pressing the button below will trigger server-side verification of session, video, and consents before enqueuing into the Firestore live queue for <code className="text-[#D4AF37]">maharaja-main</code>.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={handleGoLiveSample}
              disabled={isEnqueuing}
              className="py-4 px-8 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold uppercase tracking-wider text-sm shadow-xl hover:scale-105 active:scale-95 transition flex items-center gap-3 disabled:opacity-50"
            >
              {isEnqueuing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> ENQUEUING...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-black" /> GO LIVE WITH SAMPLE VIDEO
                </>
              )}
            </button>

            <a
              href="/tv"
              target="_blank"
              rel="noopener noreferrer"
              className="py-4 px-6 rounded-xl bg-black/60 border border-[#D4AF37]/40 text-[#F3E5AB] text-sm uppercase tracking-wider font-semibold hover:bg-black transition flex items-center gap-2"
            >
              <Tv className="w-4 h-4 text-[#D4AF37]" /> OPEN /tv DISPLAY IN NEW TAB
            </a>
          </div>

          {enqueueStatus && (
            <div
              className={`mt-6 p-4 rounded-xl border text-sm flex items-start gap-3 ${
                enqueueStatus.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/50 text-red-300'
              }`}
            >
              {enqueueStatus.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              )}
              <div>{enqueueStatus.message}</div>
            </div>
          )}
        </div>

        {/* System Status Panel */}
        <div className="maharaja-card p-6 rounded-xl border border-[#D4AF37]/30">
          <h3 className="text-lg font-serif font-bold text-[#F3E5AB] mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#D4AF37]" /> Internal System Status Panel (Fix 14)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-gray-300">
            <div className="p-3 bg-black/50 rounded-lg border border-white/10 flex justify-between">
              <span>BACKEND MODE:</span>
              <span className="text-[#D4AF37] font-bold">MOCK STORE (GCP Keys Pending)</span>
            </div>
            <div className="p-3 bg-black/50 rounded-lg border border-white/10 flex justify-between">
              <span>ALLOW_MOCK_BACKEND:</span>
              <span className="text-emerald-400 font-bold">TRUE</span>
            </div>
            <div className="p-3 bg-black/50 rounded-lg border border-white/10 flex justify-between">
              <span>REAL_GEMINI_ANALYSIS:</span>
              <span className="text-gray-400 font-bold">SDK READY (Key Pending)</span>
            </div>
            <div className="p-3 bg-black/50 rounded-lg border border-white/10 flex justify-between">
              <span>REAL_VEO:</span>
              <span className="text-gray-400 font-bold">SDK READY (Quota Pending)</span>
            </div>
            <div className="p-3 bg-black/50 rounded-lg border border-white/10 flex justify-between col-span-1 sm:col-span-2">
              <span>REAL_QA_STATUS:</span>
              <span className="text-yellow-400 font-bold">NOT IMPLEMENTED (Fix 13)</span>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
