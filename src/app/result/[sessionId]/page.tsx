'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Tv, Sparkles, CheckCircle2, RotateCcw, Flame, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ResultPage({ params }: { params: { sessionId: string } }) {
  const [showLiveConsent, setShowLiveConsent] = useState(false);
  const [publicConsent, setPublicConsent] = useState(true);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [liveSuccess, setLiveSuccess] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const sessionId = params?.sessionId || 'sample-session';
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoId, setVideoId] = useState(`video_${sessionId}`);
  const [videoStatus, setVideoStatus] = useState<'processing' | 'ready'>('processing');
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    async function checkVideoStatus() {
      try {
        const res = await fetch(`/api/video/status?sessionId=${sessionId}`);
        const data = await res.json();
        if (!isMounted) return;

        if (data.success) {
          if (data.status === 'ready' || data.status === 'succeeded') {
            setVideoUrl(data.videoUrl);
            setVideoId(data.videoId || `video_${sessionId}`);
            setVideoStatus('ready');
            setIsLoadingVideo(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Polling error checking video status:', err);
      }

      if (isMounted) {
        timer = setTimeout(checkVideoStatus, 3000);
      }
    }

    checkVideoStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `Maharaja-Diwali-${sessionId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmGoLive = async () => {
    if (!publicConsent) return;
    setIsGoingLive(true);
    setLiveError(null);

    try {
      const res = await fetch('/api/live/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          videoId
        })
      });

      const data = await res.json();
      if (data.success) {
        setLiveSuccess(true);
        setShowLiveConsent(false);
      } else {
        setLiveError(data.error || 'Failed to enqueue video');
      }
    } catch (err: any) {
      setLiveError('Network error triggering Go Live');
    } finally {
      setIsGoingLive(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070609] text-[#F8F5EE] p-4 md:p-8 font-sans max-w-lg mx-auto relative">
      
      {/* Header */}
      <header className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-[#D4AF37] animate-diya" />
          <h1 className="text-base font-serif font-bold text-[#F3E5AB] tracking-widest uppercase">
            MAHARAJA DIWALI FILM
          </h1>
        </div>
        <span className="text-[10px] font-mono text-[#D4AF37] bg-[#6e0d1f]/40 px-2 py-1 rounded border border-[#D4AF37]/30">
          ID: {sessionId.substring(0, 10)}
        </span>
      </header>

      {/* Rendering / Loading State */}
      {isLoadingVideo || videoStatus === 'processing' || !videoUrl ? (
        <div className="py-20 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#6e0d1f]/40 border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] animate-pulse">
            <Sparkles className="w-10 h-10 animate-spin" />
          </div>
          <h2 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
            RENDERING 6-SECOND DIWALI COMMERCIAL...
          </h2>
          <p className="text-xs text-gray-300 max-w-xs mx-auto animate-pulse">
            Google Veo is synthesizing your full-body video with exact identity & garment preservation. Please wait...
          </p>
        </div>
      ) : (
        /* Main Result Card when Ready */
        <div className="space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#6e0d1f]/40 border border-[#D4AF37]/40 text-[#F3E5AB] text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" /> ✨ YOUR DIWALI FILM IS READY
          </div>

        {/* 9:16 Video Preview Frame */}
        <div className="relative aspect-[9/16] w-full max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.25)] bg-black">
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleDownload}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E089] to-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm shadow-xl hover:scale-[1.02] transition flex items-center justify-center gap-3"
          >
            <Download className="w-5 h-5 fill-black" /> DOWNLOAD DIWALI FILM
          </button>

          <button
            onClick={() => setShowLiveConsent(true)}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#6e0d1f] to-[#800A1D] border border-[#D4AF37]/50 text-[#F3E5AB] font-bold uppercase tracking-wider text-sm shadow-xl hover:scale-[1.02] transition flex items-center justify-center gap-3"
          >
            <Tv className="w-5 h-5 text-[#D4AF37]" /> GO LIVE ON MAHARAJA SCREEN
          </button>

          <Link
            href="/create"
            className="w-full py-3 px-6 rounded-xl bg-black/60 border border-gray-700 text-gray-300 text-xs font-semibold uppercase tracking-wider hover:bg-black transition flex items-center justify-center gap-2 block"
          >
            <RotateCcw className="w-4 h-4" /> CREATE ANOTHER VIDEO
          </Link>
        </div>

        {/* Success / Error Banners */}
        {liveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-sm text-left flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-200">🎉 YOU'RE GOING LIVE!</p>
              <p className="text-xs text-emerald-300/90 mt-1">
                Your Maharaja Diwali moment has been added to the big screen. Look at the store display!
              </p>
            </div>
          </div>
        )}

        {liveError && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs text-left flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div>{liveError}</div>
          </div>
        )}
      </div>
      )}

      {/* Public Display Consent Modal */}
      {showLiveConsent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full maharaja-card p-6 rounded-2xl border border-[#D4AF37]/50 space-y-4">
            <div className="flex items-center gap-2 text-[#D4AF37] font-serif font-bold text-lg uppercase tracking-wider">
              <ShieldCheck className="w-6 h-6" /> PUBLIC DISPLAY CONSENT
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Before playing your video on Maharaja's store display, please confirm public display authorization:
            </p>

            <label className="flex items-start gap-3 p-3 rounded-lg bg-black/60 border border-[#D4AF37]/30 cursor-pointer">
              <input
                type="checkbox"
                checked={publicConsent}
                onChange={(e) => setPublicConsent(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-[#D4AF37]"
              />
              <span className="text-xs text-gray-200">
                “I agree that my completed AI-generated video may be displayed on Maharaja's public promotional screens.”
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowLiveConsent(false)}
                className="w-1/2 py-3 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold uppercase tracking-wider hover:bg-gray-700"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmGoLive}
                disabled={!publicConsent || isGoingLive}
                className="w-1/2 py-3 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-50"
              >
                {isGoingLive ? 'ENQUEUING...' : 'CONFIRM & GO LIVE'}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
