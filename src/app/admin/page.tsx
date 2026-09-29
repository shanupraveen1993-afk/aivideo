'use client';

import React, { useState } from 'react';
import { Tv, Play, CheckCircle, RefreshCw, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

export default function AdminPage() {
  const [isEnqueuing, setIsEnqueuing] = useState(false);
  const [enqueueStatus, setEnqueueStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  return (
    <main className="min-h-screen bg-[#070609] text-[#F8F5EE] p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D4AF37]/20 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#D4AF37]">
              <ShieldCheck className="w-4 h-4" /> STORE OPERATIONS DASHBOARD
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#F3E5AB] tracking-wide mt-1">
              MAHARAJA THANJAVUR — ADMIN
            </h1>
          </div>
        </div>

        {/* Prototype Test Card */}
        <div className="maharaja-card p-8 rounded-2xl border border-[#D4AF37]/40 relative overflow-hidden">
          <div className="flex items-center gap-3 text-[#D4AF37] mb-2 font-mono text-xs uppercase tracking-widest">
            <Sparkles className="w-4 h-4" /> GO LIVE PROTOTYPE VERIFICATION
          </div>

          <h2 className="text-2xl font-serif font-bold text-[#F3E5AB] mb-3">
            Test In-Store Display Broadcast
          </h2>

          <p className="text-sm text-gray-300 mb-6 leading-relaxed max-w-2xl">
            Pressing the button below enqueues the sample video directly into the Firestore live queue for <code className="text-[#D4AF37]">maharaja-main</code>. Open <code className="text-[#D4AF37]">/tv</code> on your display or browser to see the automatic video playback transition.
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

        {/* Display Status */}
        <div className="maharaja-card p-6 rounded-xl border border-[#D4AF37]/30">
          <h3 className="text-lg font-serif font-bold text-[#F3E5AB] mb-4 flex items-center gap-2">
            <Tv className="w-5 h-5 text-[#D4AF37]" /> Connected Display Kiosk
          </h3>

          <div className="p-4 rounded-lg bg-black/50 border border-white/10 flex justify-between items-center">
            <div>
              <p className="font-semibold text-white text-sm">Maharaja Main Display</p>
              <p className="text-xs text-gray-400 font-mono">Screen ID: maharaja-main</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-medium">
              ACTIVE PLAYER
            </span>
          </div>
        </div>

      </div>
    </main>
  );
}
