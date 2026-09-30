'use client';

import React, { useState } from 'react';
import { Camera, Scan, CheckCircle2, ArrowRight, Sparkles, RefreshCw, Shirt, User, Check, Copy, Download, Upload, Video, Film, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '@/lib/utils/image';

export default function OperatorCreatePage() {
  const [sessionId] = useState(() => 'mah_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
  const [step, setStep] = useState<'garment' | 'person' | 'master' | 'videokit'>('garment');
  
  // Up to 3 garment photos
  const [garmentPhotos, setGarmentPhotos] = useState<(string | null)[]>([null, null, null]);
  const [personPhoto, setPersonPhoto] = useState<string | null>(null);
  
  // AI Analysis Results (Gemini 2.5 Flash text analysis)
  const [isAnalyzingGarment, setIsAnalyzingGarment] = useState(false);
  const [garmentAnalysis, setGarmentAnalysis] = useState<any>(null);

  const [isAnalyzingPerson, setIsAnalyzingPerson] = useState(false);
  const [personAnalysis, setPersonAnalysis] = useState<any>(null);

  // Master Image State (Manual Gemini Pro Flow)
  const [isUploadingMaster, setIsUploadingMaster] = useState(false);
  const [masterImageUrl, setMasterImageUrl] = useState<string | null>(null);

  // Video State
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [copyMasterPromptSuccess, setCopyMasterPromptSuccess] = useState(false);
  const [copyVideoPromptSuccess, setCopyVideoPromptSuccess] = useState(false);

  // 1. Handle Garment Photo Upload by Slot Index (0: Front, 1: Detail, 2: Additional View)
  const handleGarmentSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotIdx: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const { dataUrl } = await compressImage(files[0], 1600, 0.85);
      const updated = [...garmentPhotos];
      updated[slotIdx] = dataUrl;
      setGarmentPhotos(updated);

      const activeGarmentPhotos = updated.filter(Boolean) as string[];
      setIsAnalyzingGarment(true);
      try {
        const res = await fetch('/api/ai/analyze-garment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: activeGarmentPhotos, sessionId })
        });
        const data = await res.json();
        if (data.success) {
          setGarmentAnalysis(data.analysis);
        }
      } catch (err) {
        console.error('Garment analysis error:', err);
      } finally {
        setIsAnalyzingGarment(false);
      }
    } catch (compressErr) {
      console.error('Image compression failed:', compressErr);
    }
  };

  // 2. Handle Person Photo Upload
  const handlePersonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const { dataUrl } = await compressImage(files[0], 1600, 0.85);
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
        }
      } catch (err) {
        console.error('Person analysis error:', err);
      } finally {
        setIsAnalyzingPerson(false);
      }
    } catch (compressErr) {
      console.error('Image compression failed:', compressErr);
    }
  };

  // 3. Exact Master Image Prompt Text Required
  const getMasterImagePrompt = () => {
    return `Use the uploaded person photograph as the exact identity reference. Preserve facial features, face shape, skin tone, hairstyle and realistic body proportions. Use the uploaded garment photographs as the exact clothing reference. Dress the same person naturally and photorealistically in the selected garment, preserving its exact primary color, secondary colors, fabric appearance, embroidery, patterns, borders, silhouette and design. If only a top garment is supplied, create a tasteful complementary traditional lower garment without changing the supplied product. Create an elegant premium Indian Diwali fashion portrait in vertical 9:16, strict full-body head-to-toe framing, natural standing pose, attractive festive styling, warm diya lighting and refined Diwali décor. The result must look like the same real customer genuinely wearing the selected Maharaja garment. Do not change face identity, garment color, embroidery or pattern. No duplicate person, extra limbs, malformed hands, text or generated logos.`;
  };

  const handleCopyMasterPrompt = () => {
    const prompt = getMasterImagePrompt();
    navigator.clipboard.writeText(prompt);
    setCopyMasterPromptSuccess(true);
    setTimeout(() => setCopyMasterPromptSuccess(false), 3000);
  };

  // 4. Exact Video Prompt Text Required
  const getGeminiVideoPrompt = () => {
    return `Create a photorealistic premium 6-second vertical 9:16 Diwali fashion commercial using the uploaded master reference image as the definitive visual reference. Preserve the exact person's identity, facial features, skin tone, hairstyle, body proportions, garment design, garment color, fabric, embroidery, pattern, accessories and complete outfit throughout. The person walks slowly and naturally toward the camera while gracefully holding a glowing clay diya. Maintain strict full-body head-to-toe framing throughout so the complete garment remains visible. Surround the subject with elegant premium Diwali décor, warm diyas, floral arrangements, rangoli and festive golden lighting. The person smiles warmly and clearly says in Tamil: ‘அனைவருக்கும் இனிய தீபாவளி நல்வாழ்த்துக்கள்!’ Natural movement, anatomically correct hands, realistic fabric motion, cinematic lighting and premium Indian fashion-advertisement quality. Do not change face, body, garment, color, embroidery or hairstyle. No duplicate person, extra limbs, malformed hands, dancing, spinning, jumping, random text or generated logos.`;
  };

  const handleCopyVideoPrompt = () => {
    const prompt = getGeminiVideoPrompt();
    navigator.clipboard.writeText(prompt);
    setCopyVideoPromptSuccess(true);
    setTimeout(() => setCopyVideoPromptSuccess(false), 3000);
  };

  // 5. Direct Master Image Upload Handler
  const handleDirectMasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMaster(true);
    try {
      const contentType = file.type || 'image/jpeg';
      const signedRes = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          assetType: 'master',
          contentType
        })
      });
      const signedData = await signedRes.json();
      const storagePath = signedData.storagePath || `sessions/${sessionId}/master/master.jpg`;

      const { dataUrl } = await compressImage(file, 1600, 0.85);

      if (signedData.success && signedData.directUpload && signedData.uploadUrl) {
        await fetch(signedData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: file
        });
      }

      const completeRes = await fetch('/api/upload/master-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          storagePath,
          masterImageUrl: dataUrl
        })
      });
      const completeData = await completeRes.json();

      setMasterImageUrl(completeData.masterImageUrl || dataUrl);
    } catch (err: any) {
      console.error('Master image upload failed:', err);
      alert('Master image upload failed: ' + err.message);
    } finally {
      setIsUploadingMaster(false);
    }
  };

  // 6. Direct Video Upload Handler
  const handleDirectVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    setProgressMsg('Preparing secure video upload to Firebase Storage...');

    try {
      const contentType = file.type || 'video/mp4';

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
        setProgressMsg('Uploading video directly to Storage...');
        const putRes = await fetch(signedData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: file
        });

        if (!putRes.ok) {
          throw new Error('Direct Storage video upload failed with status ' + putRes.status);
        }
      } else {
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

      window.location.href = `/result/${sessionId}`;
    } catch (err: any) {
      console.error('Direct Video Upload Error:', err);
      alert('Video Upload Error: ' + err.message);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const garmentLabels = [
    'Garment Front',
    'Garment Detail',
    'Garment Additional View'
  ];

  const hasAnyGarment = garmentPhotos.some(Boolean);

  return (
    <main className="min-h-screen bg-[#070609] text-[#F8F5EE] p-4 md:p-8 font-sans max-w-lg mx-auto relative select-none pb-12">
      
      {/* Header */}
      <header className="flex justify-between items-center border-b border-[#D4AF37]/20 pb-4 mb-6">
        <div>
          <h1 className="text-lg font-serif font-bold text-[#F3E5AB] tracking-widest uppercase">
            MAHARAJA VISUAL ENGINE
          </h1>
          <p className="text-[10px] text-[#D4AF37]/80 tracking-widest uppercase">
            DIWALI COMMERCIAL CREATOR (MANUAL GEMINI PRO)
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
        <span className={step === 'master' ? 'text-[#D4AF37] font-bold' : ''}>3. MASTER KIT</span>
        <span>→</span>
        <span className={step === 'videokit' ? 'text-[#D4AF37] font-bold' : ''}>4. VIDEO KIT</span>
      </div>

      {/* STEP 1: GARMENT SCAN (Up to 3 photos) */}
      {step === 'garment' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
              STEP 1: GARMENT REFERENCE (UP TO 3 PHOTOS)
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Provide garment photos for Gemini Pro outfit synthesis.
            </p>
          </div>

          <div className="space-y-4">
            {garmentLabels.map((label, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-[#D4AF37]/30 bg-black/60 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono text-[#D4AF37]">
                  <span className="font-bold uppercase">{label}</span>
                  {garmentPhotos[idx] ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ADDED
                    </span>
                  ) : (
                    <span className="text-gray-500">OPTIONAL ({idx + 1}/3)</span>
                  )}
                </div>

                {garmentPhotos[idx] ? (
                  <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden border border-[#D4AF37]/40">
                    <img src={garmentPhotos[idx]!} alt={label} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] w-full rounded-lg border border-dashed border-[#D4AF37]/30 flex items-center justify-center bg-black/40 text-gray-500 text-xs font-mono">
                    NO IMAGE SELECTED
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className="py-2.5 px-3 rounded-lg bg-gradient-to-r from-[#800A1D] to-[#6e0d1f] border border-[#D4AF37]/40 text-[#F3E5AB] text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-110">
                    <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>TAKE PHOTO</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleGarmentSlotUpload(e, idx)}
                      className="hidden"
                    />
                  </label>

                  <label className="py-2.5 px-3 rounded-lg bg-black border border-[#D4AF37]/40 text-gray-200 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-900">
                    <ImageIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>FROM GALLERY</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleGarmentSlotUpload(e, idx)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Gemini Garment Analysis */}
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
              </div>
            </div>
          )}

          {hasAnyGarment && (
            <button
              onClick={() => setStep('person')}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E089] to-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition"
            >
              CONFIRM GARMENTS & PROCEED TO PERSON <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* STEP 2: PERSON SCAN */}
      {step === 'person' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
              STEP 2: CUSTOMER PERSON PHOTO
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

          <div className="grid grid-cols-2 gap-3">
            <label className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#800A1D] to-[#6e0d1f] border border-[#D4AF37]/50 text-[#F3E5AB] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:brightness-110">
              <Camera className="w-4 h-4 text-[#D4AF37]" />
              <span>TAKE PHOTO</span>
              <input type="file" accept="image/*" capture="user" onChange={handlePersonUpload} className="hidden" />
            </label>

            <label className="py-3.5 px-4 rounded-xl bg-black border border-[#D4AF37]/50 text-gray-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-900">
              <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
              <span>FROM GALLERY</span>
              <input type="file" accept="image/*" onChange={handlePersonUpload} className="hidden" />
            </label>
          </div>

          {isAnalyzingPerson && (
            <div className="p-4 rounded-xl bg-[#6e0d1f]/40 border border-[#D4AF37]/40 text-center text-xs text-[#F3E5AB] flex items-center justify-center gap-2 animate-pulse font-mono">
              <RefreshCw className="w-4 h-4 animate-spin" /> VERIFYING CUSTOMER POSE & LIGHTING...
            </div>
          )}

          {personPhoto && (
            <button
              onClick={() => setStep('master')}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E089] to-[#D4AF37] text-black font-bold uppercase tracking-wider text-sm shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition"
            >
              PROCEED TO MASTER IMAGE KIT <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* STEP 3: MASTER IMAGE KIT (Manual Gemini Pro Prompt & Upload) */}
      {step === 'master' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" /> STEP 3: MASTER IMAGE KIT
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Download photos & copy prompt for Gemini Pro image generation.
            </p>
          </div>

          {/* Download Photos Section */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-[#D4AF37] uppercase tracking-wider">1. DOWNLOAD INPUT PHOTOS FOR GEMINI PRO:</p>

            {personPhoto && (
              <a
                href={personPhoto}
                download={`Customer-Person-${sessionId}.jpg`}
                className="w-full py-3 px-4 rounded-xl bg-black border border-[#D4AF37]/40 text-gray-200 font-bold uppercase tracking-wider text-xs flex items-center justify-between hover:bg-gray-900"
              >
                <span className="flex items-center gap-2"><User className="w-4 h-4 text-[#D4AF37]" /> DOWNLOAD PERSON PHOTO</span>
                <Download className="w-4 h-4 text-[#D4AF37]" />
              </a>
            )}

            {garmentPhotos.map((photo, idx) => (
              photo ? (
                <a
                  key={idx}
                  href={photo}
                  download={`Garment-Photo-${idx + 1}-${sessionId}.jpg`}
                  className="w-full py-3 px-4 rounded-xl bg-black border border-[#D4AF37]/40 text-gray-200 font-bold uppercase tracking-wider text-xs flex items-center justify-between hover:bg-gray-900"
                >
                  <span className="flex items-center gap-2"><Shirt className="w-4 h-4 text-[#D4AF37]" /> DOWNLOAD GARMENT PHOTO {idx + 1}</span>
                  <Download className="w-4 h-4 text-[#D4AF37]" />
                </a>
              ) : null
            ))}
          </div>

          {/* Copy Master Prompt */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-[#D4AF37] uppercase tracking-wider">2. COPY MASTER IMAGE PROMPT:</p>
            <button
              onClick={handleCopyMasterPrompt}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold uppercase tracking-wider text-xs shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition"
            >
              <Copy className="w-4 h-4 fill-black" />
              {copyMasterPromptSuccess ? '✓ PROMPT COPIED TO CLIPBOARD' : 'COPY MASTER IMAGE PROMPT'}
            </button>
          </div>

          {/* Master Image Upload */}
          <div className="p-5 rounded-xl bg-[#6e0d1f]/40 border-2 border-dashed border-[#D4AF37] text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-black/60 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
                3. UPLOAD GENERATED MASTER IMAGE (JPG / PNG)
              </p>
              <p className="text-[11px] text-gray-300 mt-0.5">
                Upload your Gemini Pro generated master fashion image.
              </p>
            </div>

            <label className="inline-flex py-3 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E089] to-[#D4AF37] text-black font-bold uppercase tracking-wider text-xs shadow-xl cursor-pointer hover:scale-105 transition items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4 fill-black" />
              <span>{isUploadingMaster ? 'UPLOADING MASTER...' : 'SELECT & UPLOAD MASTER IMAGE'}</span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleDirectMasterUpload}
                disabled={isUploadingMaster}
                className="hidden"
              />
            </label>
          </div>

          {/* 9:16 Preview of Uploaded Master */}
          {masterImageUrl && (
            <div className="space-y-4 pt-2">
              <div className="relative aspect-[9/16] w-full max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-2xl bg-black">
                <img src={masterImageUrl} alt="Uploaded Master Reference" className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3 bg-emerald-950/90 border border-emerald-500/50 px-3 py-1 rounded-full text-[10px] text-emerald-300 font-mono">
                  MASTER UPLOADED ✓
                </div>
              </div>

              <button
                onClick={() => setStep('videokit')}
                className="w-full py-4 px-6 rounded-xl bg-emerald-600 text-white font-bold uppercase tracking-wider text-sm shadow-xl hover:bg-emerald-500 transition flex items-center justify-center gap-2"
              >
                CONTINUE TO VIDEO <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: VIDEO KIT (Manual Gemini Pro Video Prompt & MP4 Upload) */}
      {step === 'videokit' && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-serif font-bold text-[#F3E5AB] uppercase tracking-wider flex items-center justify-center gap-2">
              <Film className="w-5 h-5 text-[#D4AF37]" /> STEP 4: VIDEO KIT
            </h2>
            <p className="text-xs text-gray-300 mt-1">
              Download master image & copy video prompt, then upload generated MP4 video below.
            </p>
          </div>

          {/* 9:16 Uploaded Master Image Frame */}
          {masterImageUrl && (
            <div className="relative aspect-[9/16] w-full max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-2xl bg-black">
              <img src={masterImageUrl} alt="Master Reference" className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1 rounded-full text-[10px] text-emerald-300 font-mono">
                MASTER REFERENCE ✓
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <a
              href={masterImageUrl || '/sample-master.jpg'}
              download={`Master-Image-${sessionId}.jpg`}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold uppercase tracking-wider text-xs shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition"
            >
              <Download className="w-4 h-4 fill-black" /> DOWNLOAD MASTER IMAGE
            </a>

            <button
              onClick={handleCopyVideoPrompt}
              className="w-full py-3.5 px-6 rounded-xl bg-black/80 border-2 border-[#D4AF37] text-[#F3E5AB] font-bold uppercase tracking-wider text-xs shadow-lg flex items-center justify-center gap-2 hover:bg-black transition"
            >
              <Copy className="w-4 h-4 text-[#D4AF37]" />
              {copyVideoPromptSuccess ? '✓ PROMPT COPIED TO CLIPBOARD' : 'COPY GEMINI VIDEO PROMPT'}
            </button>
          </div>

          {/* Upload Generated Video */}
          <div className="p-5 rounded-xl bg-[#6e0d1f]/40 border-2 border-dashed border-[#D4AF37] text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-black/60 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs font-serif font-bold text-[#F3E5AB] uppercase tracking-wider">
                UPLOAD GENERATED VIDEO (.MP4)
              </p>
              <p className="text-[11px] text-gray-300 mt-0.5">
                Upload your MP4 video file to trigger Download & Go Live TV playback.
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
