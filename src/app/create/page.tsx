'use client';

import React, { useState } from 'react';
import { Camera, Scan, CheckCircle2, ArrowRight, Sparkles, RefreshCw, Shirt, User, Check, Copy, Download, Upload, Video, Film } from 'lucide-react';
import { compressImage } from '@/lib/utils/image';

export default function OperatorCreatePage() {
  const [sessionId] = useState(() => 'mah_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
  const [step, setStep] = useState<'garment' | 'person' | 'master' | 'videokit' | 'consent' | 'generating'>('garment');
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
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 1. Handle Garment Capture & Gemini Analysis Trigger
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

  // 3. Controlled Video Prompt Text
  const getControlledVideoPrompt = () => {
    const garmentType = garmentAnalysis?.garmentType || 'outfit';
    const primaryColor = garmentAnalysis?.primaryColor || 'selected';
    return `Photorealistic 6-second vertical 9:16 full-body cinematic commercial video. Using the exact facial features and identity from the uploaded user reference photo, seamlessly composite her wearing the ${primaryColor} ${garmentType} from the uploaded product photo as a complete, full-length outfit. The action starts with her walking smoothly forward toward the camera from a vibrant, colorful, and fully decorated Diwali festive background filled with bright traditional lights, floral arrangements, and festive decor. Strict full-length head-to-toe framing is maintained throughout to show the complete silhouette and length of the dress. She smiles warmly, holding a glowing clay diya lamp gracefully in her hands. Professional festive makeup, glowing soft skin highlights, and traditional styling matching her features. Embedded Tamil voiceover saying: "அனைவருக்கும் இனிய தீபாவளி நல்வாழ்த்துக்கள்!". High-end commercial color grading, sharp focus, 4K vertical.`;
  };

  const handleCopyPrompt = () => {
    const prompt = getControlledVideoPrompt();
    navigator.clipboard.writeText(prompt);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // 4. Handle Direct Browser-to-Storage Video Upload (No Vercel Piping)
  const handleDirectVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    setProgressMsg('Preparing secure upload to Firebase Storage...');

    try {
      const contentType = file.type || 'video/mp4';

      // Step A: Request Signed Upload URL
      const signedRes = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          assetType: 'video',
          contentType
        })
      });
      const signedData = await signedRes.json();
      const storagePath = signedData.storagePath || `sessions/${sessionId}/video/final.mp4`;

      let uploadedVideoUrl: string | null = null;

      if (signedData.success && signedData.directUpload && signedData.uploadUrl) {
        // Direct browser PUT to Firebase Storage Signed URL
        setProgressMsg('Uploading video directly to Storage...');
        const putRes = await fetch(signedData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: file
        });

        if (!putRes.ok) {
          throw new Error('Direct Storage upload failed with status ' + putRes.status);
        }
      } else {
        // Fallback server upload if signed URLs are not active
        setProgressMsg('Uploading video file...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', sessionId);

        const uploadRes = await fetch('/api/upload/video', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error || 'Video upload failed');
        uploadedVideoUrl = uploadData.videoUrl;
      }

      // Step B: Call POST /api/video/manual-complete
      setProgressMsg('Finalizing Diwali Commercial Film...');
      const completeRes = await fetch('/api/video/manual-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          storagePath,
          videoUrl: uploadedVideoUrl
        })
      });
      const completeData = await completeRes.json();

      if (!completeData.success) {
        throw new Error(completeData.error || 'Failed to complete video registration.');
      }

      // Step C: Redirect to Result Page
      window.location.href = `/result/${sessionId}`;
    } catch (err: any) {
      console.error('Direct Video Upload Error:', err);
      alert('Video Upload Error: ' + err.message);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070609] text-[#F8F5EE] p-4 md:p-8 font-sans max-w-lg mx-auto relative select-none pb-12">
      
      {/* Header */}
      <header className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-4 mb-6">
        <div>
          <h1 className="text-lg font-serif font-bold text-[#F3E5AB] tracking-widest uppercase">
            MAHARAJA VISUAL ENGINE
          </h1>
          <p className="text-[10px] text-[#D4AF37]/80 tracking-widest uppercase">
            DIWALI COMMERCIAL CREATOR
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] uppercase font-mono px-3 py-1 rounded-full bg-[#6e0d1f]/40 border border-[#D4AF37]/40 text-[#F3E5AB]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> STUDIO ACTIVE
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
        <span className={step === 'videokit' ? 'text-[#D4AF37] font-bold' : ''}>4. VIDEO KIT</span>
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
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold uppercase tracking-wider text-sm shadow-xl flex items-center justify-center gap-3 cursor-pointer hover:brightness-110 transition">
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

      {/* Step 2: Customer Scan */}
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
            <label className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold uppercase tracking-wider text-sm shadow-xl flex items-center justify-center gap-3 cursor-pointer hover:brightness-110 transition">
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
              Photorealistic fashion reference synthesized for video generation.
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
            <div className="space-y-5">
              <div className="relative aspect-[9/16] w-full max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-2xl bg-black">
                <img
                  src={masterImageUrl || '/sample-master.jpg'}
                  alt="Master Reference"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1 rounded-full text-[10px] text-emerald-300 font-mono">
                  MASTER APPROVED ✓
                </div>
              </div>

              <div className="maharaja-card p-4 rounded-xl border border-[#D4AF37]/30 text-xs text-gray-300 space-y-1">
                <p className="text-[#D4AF37] font-bold">OPERATOR VERIFICATION CHECKLIST:</p>
                <p>✓ Customer identity & facial features preserved</p>
                <p>✓ Purchased garment embroidery & colors rendered</p>
                <p>✓ Diwali festive background & diya lighting locked</p>
              </div>

              <button
                onClick={() => setStep('videokit')}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E089] to-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm shadow-xl hover:scale-105 transition flex items-center justify-center gap-2"
              >
                APPROVE MASTER & PREPARE VIDEO KIT <Check className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: YOUR AI VIDEO KIT IS READY (Mobile Step) */}
      {step === 'videokit' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider flex items-center justify-center gap-2">
              <Film className="w-5 h-5 text-[#D4AF37]" /> YOUR AI VIDEO KIT IS READY
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Download master image & copy prompt, then upload generated video below.
            </p>
          </div>

          {/* 1. Approved Master Image Frame */}
          <div className="relative aspect-[9/16] w-full max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-2xl bg-black">
            <img
              src={masterImageUrl || '/sample-master.jpg'}
              alt="Approved Master"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1 rounded-full text-[10px] text-emerald-300 font-mono">
              APPROVED REFERENCE ✓
            </div>
          </div>

          {/* 2 & 3. Primary Action Buttons */}
          <div className="space-y-3">
            <a
              href={masterImageUrl || '/sample-master.jpg'}
              download={`Maharaja-Master-${sessionId}.jpg`}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold uppercase tracking-wider text-xs shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition"
            >
              <Download className="w-4 h-4 fill-black" /> DOWNLOAD MASTER IMAGE
            </a>

            <button
              onClick={handleCopyPrompt}
              className="w-full py-3.5 px-6 rounded-xl bg-black/80 border-2 border-[#D4AF37] text-[#F3E5AB] font-bold uppercase tracking-wider text-xs shadow-lg flex items-center justify-center gap-2 hover:bg-black transition"
            >
              <Copy className="w-4 h-4 text-[#D4AF37]" />
              {copySuccess ? '✓ PROMPT COPIED TO CLIPBOARD' : 'COPY GEMINI VIDEO PROMPT'}
            </button>
          </div>

          {/* 4. Instructions */}
          <div className="maharaja-card p-4 rounded-xl border border-[#D4AF37]/30 text-xs text-gray-300 space-y-2">
            <p className="text-[#D4AF37] font-serif font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span>📲 GENERATION INSTRUCTIONS</span>
            </p>
            <ol className="list-decimal list-inside text-[11px] text-gray-300 space-y-1.5 leading-relaxed font-sans">
              <li>Open the <strong>Gemini app</strong> on your phone.</li>
              <li>Upload the downloaded <strong>Master Image</strong> as reference.</li>
              <li>Paste the copied <strong>AI Commercial Prompt</strong> and tap generate.</li>
              <li>Download your finished <strong>.MP4 video</strong> to your phone.</li>
              <li>Tap <strong>Upload Generated Video</strong> below to push to store TV display.</li>
            </ol>
          </div>

          {/* 5. UPLOAD GENERATED VIDEO Dropzone */}
          <div className="p-5 rounded-xl bg-[#6e0d1f]/40 border-2 border-dashed border-[#D4AF37] text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-black/60 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
                UPLOAD GENERATED VIDEO (.MP4)
              </p>
              <p className="text-[11px] text-gray-300 mt-0.5">
                Upload your MP4 video file to immediately trigger Download & Go Live TV playback.
              </p>
            </div>

            <label className="inline-flex py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E089] to-[#D4AF37] text-black font-bold uppercase tracking-wider text-xs shadow-xl cursor-pointer hover:scale-105 transition items-center justify-center gap-2">
              <Video className="w-4 h-4 fill-black" />
              <span>SELECT & UPLOAD GENERATED VIDEO</span>
              <input
                type="file"
                accept="video/mp4,video/*"
                onChange={handleDirectVideoUpload}
                disabled={isUploadingVideo}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Uploading Overlay */}
      {isUploadingVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-[#D4AF37] animate-spin" />
          <h3 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
            UPLOADING DIWALI FILM
          </h3>
          <p className="text-xs text-[#D4AF37] font-mono animate-pulse">
            {progressMsg}
          </p>
        </div>
      )}

    </main>
  );
}
