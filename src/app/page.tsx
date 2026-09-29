'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, Sparkles, ArrowRight, Camera, Shirt, Tv, Award, Smartphone } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#070609] text-[#F8F5EE] font-sans relative overflow-hidden">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-radial from-[#6e0d1f]/30 via-[#2A060C]/10 to-transparent pointer-events-none blur-3xl" />

      {/* Header */}
      <header className="relative z-20 max-w-7xl mx-auto px-6 py-8 flex justify-between items-center border-b border-[#D4AF37]/20">
        <div className="flex items-center gap-3">
          <Flame className="w-8 h-8 text-[#D4AF37] animate-diya" />
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#F3E5AB] tracking-widest uppercase">
              MAHARAJA
            </h1>
            <p className="text-[10px] text-[#D4AF37]/70 tracking-widest uppercase">
              THANJAVUR — SINCE 1985
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-xs uppercase tracking-wider text-gray-400 hover:text-[#D4AF37] transition hidden sm:block"
          >
            Store Admin
          </Link>
          <Link
            href="/tv"
            className="text-xs uppercase tracking-wider px-4 py-2 rounded-full border border-[#D4AF37]/40 text-[#F3E5AB] hover:bg-[#D4AF37]/10 transition"
          >
            TV Player
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6e0d1f]/40 border border-[#D4AF37]/40 text-[#F3E5AB] text-xs uppercase tracking-widest mb-8">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          EXCLUSIVELY FOR DIWALI PURCHASES ₹5,000+
        </div>

        <h1 className="text-4xl md:text-7xl font-serif font-bold text-[#F3E5AB] leading-tight tracking-wide mb-6">
          “This Diwali, turn every ₹5,000+ purchase into a moment worth sharing.”
        </h1>

        <p className="text-lg md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 font-light leading-relaxed">
          Customers don't just buy an outfit. They become the face of Maharaja's Diwali celebration on our store screen.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-5">
          <Link
            href="/create"
            className="w-full sm:w-auto py-4 px-8 rounded-full bg-gradient-to-r from-[#800A1D] via-[#D4AF37] to-[#800A1D] text-black font-bold uppercase tracking-wider text-base shadow-2xl hover:scale-105 transition flex items-center justify-center gap-3"
          >
            CREATE AI VIDEO <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="#journey"
            className="w-full sm:w-auto py-4 px-8 rounded-full bg-black/60 border border-[#D4AF37]/40 text-[#F3E5AB] uppercase tracking-wider text-sm font-semibold hover:bg-black transition"
          >
            EXPLORE THE IDEA
          </a>
        </div>
      </section>

      {/* Visual Journey Steps */}
      <section id="journey" className="relative z-10 max-w-6xl mx-auto px-6 py-16 border-t border-[#D4AF37]/15">
        <div className="text-center mb-14">
          <p className="text-xs text-[#D4AF37] uppercase tracking-widest font-semibold mb-2">
            THE MAHARAJA EXPERIENCE JOURNEY
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#F3E5AB]">
            SHOP → SCAN → STYLE → STAR → SHARE → GO LIVE
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="maharaja-card p-8 rounded-2xl border border-[#D4AF37]/30 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#6e0d1f]/40 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Shirt className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#F3E5AB] mb-2">1. Garment Scan</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Store staff photograph the customer's purchased outfit using the Maharaja Visual Engine scanner.
            </p>
          </div>

          <div className="maharaja-card p-8 rounded-2xl border border-[#D4AF37]/30 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#6e0d1f]/40 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#F3E5AB] mb-2">2. AI Styling & Film</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Gemini synthesizes a master fashion reference image and generates an 8-second Diwali video with a Tamil greeting.
            </p>
          </div>

          <div className="maharaja-card p-8 rounded-2xl border border-[#D4AF37]/30 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#6e0d1f]/40 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <Tv className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#F3E5AB] mb-2">3. Download & Go Live</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Customer downloads their MP4 video and hits GO LIVE to broadcast it onto Maharaja's main in-store TV display.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#D4AF37]/20 py-8 text-center text-xs text-gray-500">
        MAHARAJA READY-MADE STORE, THANJAVUR, TAMIL NADU • POWERED BY GOOGLE AI & NEXT.JS
      </footer>

    </main>
  );
}
