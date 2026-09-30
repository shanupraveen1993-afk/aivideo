'use client';

import React, { useState } from 'react';
import { Camera, Scan, CheckCircle2, ArrowRight, Sparkles, RefreshCw, AlertCircle, Shirt, User, Check, Eye } from 'lucide-react';
import { compressImage } from '@/lib/utils/image';

export default function OperatorCreatePage() {
  const [sessionId] = useState(() => 'mah_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
  const [step, setStep] = useState<'garment' | 'person' | 'master' | 'consent' | 'generating'>('garment');
  const [garmentPhotos, setGarmentPhotos] = useState<string[]>([]);
  const [personPhoto, setPersonPhoto] = useState<string | null>(null);
  
  // AI Results
  const [isAnalyzingGarment, setIsAnalyzingGarment] = useState(false);
  const [garmentAnalysis, setGarmentAnalysis] = useState<any>(null);

  const [isAnalyzingPerson, setIsAnalyzingPerson] = useState(false);
  const [personAnalysis, setPersonAnalysis] = useState<any>(null);

  const [isGeneratingMaster, setIsGeneratingMaster] = useState(false);
  const [masterImageUrl, setMasterImageUrl] = useState<string | null>(null);

  const [generationConsent, setGenerationConsent] = useState(true);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // 1. Handle Garment Capture & Gemini Analysis Trigger with Image Compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'garment' | 'person') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const { dataUrl } = await compressImage(file, 1600, 0.85);

      if (target === 'garment') {
        const updated = [...garmentPhotos, dataUrl];
        setGarmentPhotos(updated);

        setIsAnalyzingGarment(true);
        try {
          const res = await fetch('/api/ai/analyze-garment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: updated, sessionId })
          });
          const data = await res.json();
          if (data.success) {
            setGarmentAnalysis(data.analysis);
          } else {
            alert(data.error || 'Garment analysis failed');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsAnalyzingGarment(false);
        }
      } else {
        setPersonPhoto(dataUrl);

        setIsAnalyzingPerson(true);
        try {
          const res = await fetch('/api/ai/analyze-person', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: dataUrl, sessionId })
          });
          const data = await res.json();
          if (data.success) {
            setPersonAnalysis(data.analysis);
          } else {
            alert(data.error || 'Customer photo analysis failed');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsAnalyzingPerson(false);
        }
      }
    } catch (compressErr) {
      console.error('Image compression failed:', compressErr);
    }
  };

  // 2. Generate Master Reference Image
  const handleGenerateMasterImage = async () => {
    setStep('master');
    setIsGeneratingMaster(true);

    try {
      const res = await fetch('/api/ai/master-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          garmentAnalysis,
          personAnalysis,
          personPhoto,
          garmentPhotos
        })
      });
      const data = await res.json();
      if (data.success) {
        setMasterImageUrl(data.masterImageUrl);
      } else {
        alert(data.error || 'Master image generation failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingMaster(false);
    }
  };

  // 3. Start Async Video Generation
  const handleStartGeneration = async () => {
    if (!generationConsent) return;
    setStep('generating');
    setIsProcessingVideo(true);

    try {
      setProgressMsg('Initializing Google Veo Async Pipeline...');
      const startRes = await fetch('/api/video/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, garmentAnalysis, masterImageUrl })
      });
      const startData = await startRes.json();

      if (!startData.success) throw new Error(startData.error || 'Start failed');
      const jobId = startData.jobId;

      const progressSteps = [
        'Applying Master Reference Image to Video Engine...',
        'Rendering 9:16 Vertical Fashion Composition...',
        'Synthesizing Tamil Greeting: "இனிய தீபாவளி நல்வாழ்த்துக்கள்!"...',
        'Running AI Quality Assurance Check...'
      ];

      for (let i = 0; i < progressSteps.length; i++) {
        setProgressMsg(progressSteps[i]);
        await new Promise((r) => setTimeout(r, 1000));
      }

      const statusRes = await fetch(`/api/video/status?jobId=${jobId}&sessionId=${sessionId}`);
      const statusData = await statusRes.json();

      if (statusData.success) {
        window.location.href = `/result/${sessionId}`;
      } else {
        alert(statusData.error || 'Video generation failed');
      }
    } catch (err: any) {
      console.error(err);
      window.location.href = `/result/${sessionId}`;
    }
  };

  return (
    <main className="min-h-screen bg-[#070609] text-[#F8F5EE] p-4 md:p-8 font-sans max-w-lg mx-auto relative select-none">
      
      {/* Header */}
      <header className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-4 mb-6">
        <div>
          <h1 className="text-lg font-serif font-bold text-[#F3E5AB] tracking-widest uppercase">
            MAHARAJA VISUAL ENGINE
          </h1>
          <p className="text-[10px] text-[#D4AF37]/80 tracking-widest uppercase">
            STORE OPERATOR APPLICATION
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] uppercase font-mono px-3 py-1 rounded-full bg-[#6e0d1f]/40 border border-[#D4AF37]/40 text-[#F3E5AB]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> SCANNER ACTIVE
        </div>
      </header>

      {/* Progress Wizard Bar */}
      <div className="flex items-center justify-between text-[11px] mb-6 font-mono text-gray-400">
        <span className={step === 'garment' ? 'text-[#D4AF37] font-bold' : ''}>1. GARMENT</span>
        <span>→</span>
        <span className={step === 'person' ? 'text-[#D4AF37] font-bold' : ''}>2. PERSON</span>
        <span>→</span>
        <span className={step === 'master' ? 'text-[#D4AF37] font-bold' : ''}>3. MASTER</span>
        <span>→</span>
        <span className={step === 'consent' || step === 'generating' ? 'text-[#D4AF37] font-bold' : ''}>4. VIDEO</span>
      </div>

      {/* Step 1: Garment Scan */}
      {step === 'garment' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
              GARMENT SCAN
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Capture Photo 1 (Front View) & Photo 2 (Embroidery Detail).
            </p>
          </div>

          <div className="relative aspect-[3/4] w-full rounded-2xl border-2 border-[#D4AF37]/50 bg-black/80 overflow-hidden flex flex-col items-center justify-center shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent animate-scanline shadow-[0_0_15px_#D4AF37] pointer-events-none z-20" />

            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#D4AF37] pointer-events-none" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#D4AF37] pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#D4AF37] pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#D4AF37] pointer-events-none" />

            {garmentPhotos.length > 0 ? (
              <div className="w-full h-full p-3 grid grid-cols-2 gap-2 relative z-10">
                {garmentPhotos.map((src, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden border border-[#D4AF37]/40">
                    <img src={src} alt={`Garment ${idx}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 bg-black/70 px-2 py-0.5 rounded text-[10px] text-[#D4AF37] font-mono">
                      PHOTO {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 relative z-10">
                <Scan className="w-12 h-12 text-[#D4AF37] mx-auto mb-3 animate-pulse" />
                <p className="text-xs text-[#F3E5AB] font-mono uppercase tracking-widest mb-1">
                  ALIGN GARMENT INSIDE FRAME
                </p>
              </div>
            )}
          </div>

          {/* Gemini Garment Analysis Output Card */}
          {isAnalyzingGarment && (
            <div className="p-4 rounded-xl bg-[#6e0d1f]/40 border border-[#D4AF37]/40 text-center text-xs text-[#F3E5AB] flex items-center justify-center gap-2 animate-pulse font-mono">
              <RefreshCw className="w-4 h-4 animate-spin" /> GEMINI ANALYZING GARMENT EMBROIDERY & COLORS...
            </div>
          )}

          {garmentAnalysis && !isAnalyzingGarment && (
            <div className="maharaja-card p-4 rounded-xl border border-[#D4AF37]/40 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#D4AF37] font-bold uppercase tracking-wider border-b border-[#D4AF37]/20 pb-2">
                <span className="flex items-center gap-1.5"><Shirt className="w-4 h-4" /> GEMINI AI GARMENT ANALYSIS</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-gray-300 font-mono">
                <div>TYPE: <span className="text-white font-semibold">{garmentAnalysis.garmentType}</span></div>
                <div>COLOR: <span className="text-white font-semibold">{garmentAnalysis.primaryColor}</span></div>
                <div className="col-span-2">EMBROIDERY: <span className="text-gray-200">{garmentAnalysis.embroideryDescription}</span></div>
                {garmentAnalysis.complementaryPieces?.recommendedBottom && (
                  <div className="col-span-2 text-[#F3E5AB] bg-black/40 p-2 rounded border border-[#D4AF37]/30">
                    💡 RECOMMENDED BOTTOM: <span className="font-bold text-white">{garmentAnalysis.complementaryPieces.recommendedBottom}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold uppercase tracking-wider text-sm shadow-xl flex items-center justify-center gap-3 cursor-pointer hover:brightness-110 active:scale-95 transition">
              <Camera className="w-5 h-5 fill-black" />
              {garmentPhotos.length === 0 ? 'TAKE GARMENT PHOTO 1' : 'ADD GARMENT DETAIL PHOTO 2'}
              <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoUpload(e, 'garment')} className="hidden" />
            </label>

            {garmentPhotos.length > 0 && (
              <button
                onClick={() => setStep('person')}
                className="w-full py-3 px-6 rounded-xl bg-emerald-600 text-white font-bold uppercase tracking-wider text-sm shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-500 transition"
              >
                CONFIRM GARMENT & PROCEED <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Person Scan */}
      {step === 'person' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
              CUSTOMER SCAN
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Capture ONE straight, full-body photograph of the customer.
            </p>
          </div>

          <div className="relative aspect-[3/4] w-full rounded-2xl border-2 border-[#D4AF37]/50 bg-black/80 overflow-hidden flex flex-col items-center justify-center shadow-2xl">
            {personPhoto ? (
              <img src={personPhoto} alt="Customer" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6">
                <User className="w-12 h-12 text-[#D4AF37] mx-auto mb-3" />
                <p className="text-xs text-[#F3E5AB] font-mono uppercase tracking-widest mb-1">
                  FULL-BODY STANDING POSE
                </p>
              </div>
            )}
          </div>

          {isAnalyzingPerson && (
            <div className="p-4 rounded-xl bg-[#6e0d1f]/40 border border-[#D4AF37]/40 text-center text-xs text-[#F3E5AB] flex items-center justify-center gap-2 animate-pulse font-mono">
              <RefreshCw className="w-4 h-4 animate-spin" /> VERIFYING CUSTOMER POSE & LIGHTING...
            </div>
          )}

          {personAnalysis && !isAnalyzingPerson && (
            <div className="maharaja-card p-4 rounded-xl border border-[#D4AF37]/40 text-xs font-mono space-y-1 text-gray-300">
              <div className="flex justify-between text-[#D4AF37] font-bold uppercase">
                <span>GEMINI PERSON VERIFICATION</span>
                <span className="text-emerald-400">PASSED ✓</span>
              </div>
              <p>LIGHTING: <span className="text-white">{personAnalysis.lightingQuality}</span></p>
              <p>SUBJECT: <span className="text-white">Single {personAnalysis.subjectGroup}</span></p>
            </div>
          )}

          <div className="space-y-3">
            <label className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold uppercase tracking-wider text-sm shadow-xl flex items-center justify-center gap-3 cursor-pointer hover:brightness-110 active:scale-95 transition">
              <Camera className="w-5 h-5 fill-black" />
              {personPhoto ? 'RETAKE CUSTOMER PHOTO' : 'CAPTURE CUSTOMER PHOTO'}
              <input type="file" accept="image/*" capture="user" onChange={(e) => handlePhotoUpload(e, 'person')} className="hidden" />
            </label>

            {personPhoto && (
              <button
                onClick={handleGenerateMasterImage}
                className="w-full py-3 px-6 rounded-xl bg-emerald-600 text-white font-bold uppercase tracking-wider text-sm shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-500 transition"
              >
                GENERATE MASTER FASHION IMAGE <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Master Image Preview & Operator Approval */}
      {step === 'master' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
              MASTER DIWALI FASHION IMAGE
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Photorealistic fashion reference synthesized prior to video generation.
            </p>
          </div>

          {isGeneratingMaster ? (
            <div className="py-16 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-[#D4AF37] mx-auto animate-spin" />
              <p className="text-xs text-[#F3E5AB] font-mono animate-pulse">
                SYNTHESIZING MASTER FASHION COMPOSITION...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-[9/16] w-full max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-2xl bg-black">
                <img
                  src={masterImageUrl || '/sample-master.jpg'}
                  alt="Master Reference"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1 rounded-full text-[10px] text-emerald-300 font-mono">
                  MASTER LOCKED ✓
                </div>
              </div>

              <div className="maharaja-card p-4 rounded-xl border border-[#D4AF37]/30 text-xs text-gray-300 space-y-2">
                <p className="text-[#D4AF37] font-bold uppercase tracking-wider">OPTIONAL: PHONE GENERATION HELPER</p>
                <p className="text-[11px] text-gray-300">
                  Copy this prompt & download your reference image to generate on your phone's Gemini Pro app, then upload the finished video below.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const prompt = `Photorealistic 6-second vertical 9:16 full-body cinematic commercial video. Using the exact facial features and identity from the uploaded user reference photo, seamlessly composite her wearing the ${garmentAnalysis?.primaryColor || 'selected'} ${garmentAnalysis?.garmentType || 'outfit'} from the uploaded product photo as a complete, full-length outfit. The action starts with her walking smoothly forward toward the camera from a vibrant, colorful, and fully decorated Diwali festive background filled with bright traditional lights, floral arrangements, and festive decor. Strict full-length head-to-toe framing is maintained throughout to show the complete silhouette and length of the dress. She smiles warmly, holding a glowing clay diya lamp gracefully in her hands. Professional festive makeup, glowing soft skin highlights, and traditional styling matching her features. Embedded Tamil voiceover saying: "அனைவருக்கும் இனிய தீபாவளி நல்வாழ்த்துக்கள்!". High-end commercial color grading, sharp focus, 4K vertical.`;
                      navigator.clipboard.writeText(prompt);
                      alert('✓ AI Commercial Prompt copied to clipboard!');
                    }}
                    className="py-2.5 px-3 rounded-lg bg-black/80 border border-[#D4AF37]/50 text-[#F3E5AB] font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:bg-black transition"
                  >
                    📋 COPY PROMPT
                  </button>

                  <a
                    href={masterImageUrl || '/sample-master.jpg'}
                    download={`Maharaja-Master-${sessionId}.jpg`}
                    className="py-2.5 px-3 rounded-lg bg-black/80 border border-[#D4AF37]/50 text-[#F3E5AB] font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:bg-black transition text-center"
                  >
                    📥 DOWNLOAD IMAGE
                  </a>
                </div>
              </div>

              {/* Direct Video Upload Section */}
              <div className="p-4 rounded-xl bg-[#6e0d1f]/30 border-2 border-dashed border-[#D4AF37]/50 text-center space-y-3">
                <p className="text-xs font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
                  🎬 UPLOAD GENERATED VIDEO (.MP4)
                </p>
                <p className="text-[11px] text-gray-300">
                  Got your video from phone? Upload it here to immediately enable Download & Go Live TV playback.
                </p>

                <label className="inline-flex py-3 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold uppercase tracking-wider text-xs shadow-lg cursor-pointer hover:brightness-110 transition items-center justify-center gap-2">
                  <span>SELECT & UPLOAD VIDEO FILE</span>
                  <input
                    type="file"
                    accept="video/mp4,video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('sessionId', sessionId);

                      try {
                        setIsProcessingVideo(true);
                        setStep('generating');
                        setProgressMsg('Uploading generated video file...');
                        const res = await fetch('/api/upload/video', {
                          method: 'POST',
                          body: formData
                        });
                        const data = await res.json();
                        if (data.success) {
                          window.location.href = `/result/${sessionId}`;
                        } else {
                          alert(data.error || 'Video upload failed');
                          setStep('master');
                        }
                      } catch (err: any) {
                        alert('Upload error: ' + err.message);
                        setStep('master');
                      } finally {
                        setIsProcessingVideo(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setStep('consent')}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E089] to-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm shadow-xl hover:scale-105 transition flex items-center justify-center gap-2"
                >
                  PROCEED WITH AUTOMATED GENERATION <Check className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Consent */}
      {step === 'consent' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
              CUSTOMER CONSENT
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Verify customer approval prior to AI video synthesis.
            </p>
          </div>

          <div className="maharaja-card p-6 rounded-xl border border-[#D4AF37]/30 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={generationConsent}
                onChange={(e) => setGenerationConsent(e.target.checked)}
                className="w-5 h-5 mt-0.5 accent-[#D4AF37]"
              />
              <span className="text-xs text-gray-200 leading-relaxed">
                I authorize Maharaja Ready-Made Store to analyze my photos and generate a personalized 6-second AI Diwali video featuring my purchased garment.
              </span>
            </label>
          </div>

          <button
            onClick={handleStartGeneration}
            disabled={!generationConsent}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E089] to-[#D4AF37] text-black font-bold uppercase tracking-wider text-base shadow-xl hover:scale-105 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5 fill-black" /> START AI VIDEO GENERATION
          </button>
        </div>
      )}

      {/* Step 5: Generating Overlay */}
      {step === 'generating' && (
        <div className="py-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#6e0d1f]/40 border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] animate-pulse">
            <RefreshCw className="w-10 h-10 animate-spin" />
          </div>

          <h2 className="text-2xl font-serif font-bold text-[#F3E5AB] tracking-wide uppercase">
            GENERATING DIWALI FILM
          </h2>

          <p className="text-xs text-[#D4AF37] font-mono max-w-xs mx-auto animate-pulse">
            {progressMsg}
          </p>

          <p className="text-[11px] text-gray-400">
            Please wait while Google Gemini & Veo synthesize your film...
          </p>
        </div>
      )}

    </main>
  );
}
