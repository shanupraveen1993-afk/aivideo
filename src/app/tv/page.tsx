'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Tv, Volume2, ShieldCheck, Flame, Play, CheckCircle2 } from 'lucide-react';

export default function TvPlayerPage() {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [setupPin, setSetupPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Audio autoplay unlock state
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Playback state
  const [currentPlayback, setCurrentPlayback] = useState<{
    queueId: string;
    reservationId: string;
    videoUrl: string;
  } | null>(null);

  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('maharajaDeviceToken');
    if (token) {
      setDeviceToken(token);
    }
  }, []);

  // Handle PIN registration
  const handleRegisterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setIsRegistering(true);

    try {
      const res = await fetch('/api/tv/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupPin })
      });
      const data = await res.json();

      if (data.success && data.deviceToken) {
        localStorage.setItem('maharajaDeviceToken', data.deviceToken);
        setDeviceToken(data.deviceToken);
        setSetupPin('');
      } else {
        setPinError(data.error || 'Registration failed');
      }
    } catch (err: any) {
      setPinError('Connection error during setup');
    } finally {
      setIsRegistering(false);
    }
  };

  // Unregister screen (for setup reset)
  const handleResetToken = () => {
    localStorage.removeItem('maharajaDeviceToken');
    setDeviceToken(null);
    setAudioUnlocked(false);
    setCurrentPlayback(null);
    setIsPlayingVideo(false);
  };

  // Polling engine for GET /api/tv/next
  useEffect(() => {
    if (!deviceToken || !audioUnlocked || isPlayingVideo) return;

    const pollNextVideo = async () => {
      try {
        const res = await fetch('/api/tv/next', {
          headers: {
            Authorization: `Bearer ${deviceToken}`
          }
        });

        if (res.status === 401 || res.status === 403) {
          // Token invalid or revoked
          handleResetToken();
          return;
        }

        const data = await res.json();

        if (data.status === 'play' && data.videoUrl) {
          setCurrentPlayback({
            queueId: data.queueId,
            reservationId: data.reservationId,
            videoUrl: data.videoUrl
          });
          setIsPlayingVideo(true);

          // Notify server of playing status
          fetch('/api/tv/playing', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${deviceToken}`
            },
            body: JSON.stringify({
              queueId: data.queueId,
              reservationId: data.reservationId
            })
          }).catch(console.error);
        }
      } catch (err) {
        console.warn('TV Polling Network Error (will retry):', err);
      }
    };

    pollNextVideo();
    pollingRef.current = setInterval(pollNextVideo, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [deviceToken, audioUnlocked, isPlayingVideo]);

  // Video playback completion handler
  const handleVideoEnded = async () => {
    if (!currentPlayback || !deviceToken) return;

    try {
      await fetch('/api/tv/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deviceToken}`
        },
        body: JSON.stringify({
          queueId: currentPlayback.queueId,
          reservationId: currentPlayback.reservationId
        })
      });
    } catch (err) {
      console.error('Failed to notify completion:', err);
    } finally {
      setIsPlayingVideo(false);
      setCurrentPlayback(null);
    }
  };

  // 1. Setup Screen (PIN entry)
  if (!deviceToken) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070609] p-6 font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-radial from-[#6e0d1f]/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-md w-full maharaja-card p-8 rounded-2xl relative z-10 text-center border border-[#D4AF37]/30 shadow-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#6e0d1f]/40 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
            <Tv className="w-8 h-8" />
          </div>
          
          <h1 className="text-2xl font-serif font-bold text-[#F3E5AB] tracking-widest uppercase mb-1">
            MAHARAJA SCREEN SETUP
          </h1>
          <p className="text-xs text-[#D4AF37]/70 uppercase tracking-widest mb-6">
            Thanjavur Digital Signage Kiosk
          </p>

          <form onSubmit={handleRegisterPin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#F8F5EE]/70 mb-2 font-medium">
                Enter Setup PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={setupPin}
                onChange={(e) => setSetupPin(e.target.value)}
                placeholder="482731"
                className="w-full text-center text-2xl font-mono tracking-widest py-3 px-4 rounded-xl bg-black/60 border border-[#D4AF37]/40 text-[#F3E5AB] focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>

            {pinError && (
              <p className="text-red-400 text-xs bg-red-950/40 p-2 rounded border border-red-800/40">
                {pinError}
              </p>
            )}

            <button
              type="submit"
              disabled={isRegistering || setupPin.length < 4}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-semibold uppercase tracking-wider text-sm shadow-lg hover:brightness-110 transition disabled:opacity-50"
            >
              {isRegistering ? 'PAIRING DISPLAY...' : 'PAIR THIS DISPLAY'}
            </button>
          </form>

          <p className="text-[10px] text-gray-500 mt-6">
            Default test PIN: <code className="text-[#D4AF37]">482731</code> (Configured via Vercel env)
          </p>
        </div>
      </main>
    );
  }

  // 2. Audio Autoplay Unlock Prompt
  if (!audioUnlocked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070609] p-6 text-center">
        <div className="max-w-lg w-full maharaja-card p-10 rounded-2xl border border-[#D4AF37]/40 shadow-2xl">
          <Flame className="w-12 h-12 text-[#D4AF37] mx-auto mb-4 animate-diya" />
          <h2 className="text-2xl font-serif font-bold text-[#F3E5AB] mb-2 uppercase tracking-widest">
            MAHARAJA DISPLAY READY
          </h2>
          <p className="text-sm text-gray-300 mb-6">
            Tap below once to unlock full audio autoplay capabilities for Smart TV browsers.
          </p>

          <button
            onClick={() => setAudioUnlocked(true)}
            className="w-full py-4 px-8 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5E089] text-black font-bold uppercase tracking-wider text-base shadow-xl hover:scale-105 transition flex items-center justify-center gap-3"
          >
            <Volume2 className="w-5 h-5" />
            START MAHARAJA SCREEN
          </button>

          <button
            onClick={handleResetToken}
            className="text-xs text-gray-500 hover:text-gray-300 underline mt-6 block mx-auto"
          >
            Unpair Screen Token
          </button>
        </div>
      </main>
    );
  }

  // 3. Fullscreen 16:9 Signage Player
  return (
    <main className="fixed inset-0 w-screen h-screen bg-black overflow-hidden flex items-center justify-center select-none">
      {/* 16:9 Branded Frame Container */}
      <div className="relative w-full h-full max-w-[177.78vh] max-h-[56.25vw] aspect-video bg-[#0B0609] border border-[#D4AF37]/30 flex flex-col justify-between p-6 shadow-2xl overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute inset-0 bg-radial from-[#6e0d1f]/15 via-transparent to-transparent pointer-events-none" />

        {/* Top Header Bar */}
        <header className="relative z-20 flex justify-between items-center border-b border-[#D4AF37]/20 pb-4">
          <div className="flex items-center gap-3">
            <Flame className="w-7 h-7 text-[#D4AF37] animate-diya" />
            <div>
              <h1 className="text-xl font-serif font-bold text-[#F3E5AB] tracking-widest uppercase">
                MAHARAJA
              </h1>
              <p className="text-[10px] text-[#D4AF37]/70 tracking-widest uppercase">
                THANJAVUR — DIWALI CELEBRATION
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-[#D4AF37]/30 text-[11px] text-[#F3E5AB]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE SCREEN: <span className="font-semibold text-white">MAHARAJA MAIN</span>
          </div>
        </header>

        {/* Center Content Area */}
        <div className="relative z-10 flex-1 flex items-center justify-center my-4 overflow-hidden">
          {isPlayingVideo && currentPlayback ? (
            /* Active Customer Video Playback (9:16 Vertical Frame inside 16:9 Screen) */
            <div className="relative h-full aspect-[9/16] rounded-xl overflow-hidden border-2 border-[#D4AF37] shadow-[0_0_50px_rgba(212,175,55,0.3)] bg-black">
              <video
                ref={videoRef}
                src={currentPlayback.videoUrl}
                autoPlay
                playsInline
                onEnded={handleVideoEnded}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md p-2 rounded-lg border border-[#D4AF37]/40 text-center">
                <p className="text-[10px] uppercase text-[#D4AF37] font-semibold tracking-wider">
                  ⭐ MAHARAJA DIWALI STAR
                </p>
                <p className="text-xs text-white font-medium">
                  இனிய தீபாவளி நல்வாழ்த்துக்கள்!
                </p>
              </div>
            </div>
          ) : (
            /* Idle Promotional Screen */
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-[#2A060C]/40 to-[#070609]/80 rounded-2xl border border-[#D4AF37]/20 relative">
              <Sparkles className="w-12 h-12 text-[#D4AF37] mb-4 animate-bounce" />
              
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-[#F3E5AB] tracking-wider mb-4 uppercase">
                THIS DIWALI, YOU COULD BE HERE.
              </h2>
              
              <p className="text-lg md:text-2xl text-gray-200 mb-8 max-w-2xl font-light">
                Shop <span className="text-[#D4AF37] font-semibold">₹5,000+</span> at Maharaja Thanjavur & star in your personalized AI Diwali Film on our big screen!
              </p>

              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-[#6e0d1f]/60 border border-[#D4AF37]/50 text-[#F3E5AB] text-sm uppercase tracking-widest font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                SHOP ₹5,000+ → SCAN → AI FILM → GO LIVE
              </div>
            </div>
          )}
        </div>

        {/* Bottom Ticker Footer */}
        <footer className="relative z-20 flex justify-between items-center border-t border-[#D4AF37]/20 pt-3 text-[11px] text-[#D4AF37]/80">
          <span>✨ MAHARAJA READY-MADE STORE, THANJAVUR</span>
          <span>DIWALI SPECIAL PROMOTION</span>
        </footer>

      </div>
    </main>
  );
}
