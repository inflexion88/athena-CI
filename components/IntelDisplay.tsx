import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExecutiveBrief, DeepDossier } from '../types';
import DossierModal from './DossierModal';

interface IntelDisplayProps {
  report: ExecutiveBrief | null;
  deepDossier: DeepDossier | null;
  scanningTarget?: string | null;
}

const IntelDisplay: React.FC<IntelDisplayProps> = ({ report, deepDossier, scanningTarget }) => {
  const [showDossier, setShowDossier] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState("INITIALIZING");

  // 1. ORGANIC PROGRESS SIMULATION
  // Designed to match the "Thinking" time of an LLM (approx 4-10s)
  // avoiding the "stuck at 99%" feeling by using a decaying velocity curve.
  useEffect(() => {
    if (scanningTarget && !report) {
      setLoadingProgress(0);
      let progress = 0;

      const interval = setInterval(() => {
        // VELOCITY LOGIC:
        // 0-40%: Fast (Connection)
        // 40-70%: Medium (Analysis)
        // 70-90%: Slow (Generation)
        // 90%+: Crawl (Finalization - never stops completely)

        let increment = 0;

        if (progress < 40) {
          increment = 1.5 + Math.random();
        } else if (progress < 70) {
          increment = 0.5 + Math.random() * 0.5;
        } else if (progress < 85) {
          increment = 0.2 + Math.random() * 0.2;
        } else if (progress < 99) {
          increment = 0.05; // The crawl
        }

        // Add micro-stutters to feel like real network packets
        if (Math.random() > 0.9) increment = 0;

        progress = Math.min(progress + increment, 99.9);
        setLoadingProgress(progress);

        // Update Stage Text
        if (progress < 30) setLoadingStage("ACQUIRING TARGET");
        else if (progress < 60) setLoadingStage("ANALYZING TOPOLOGY");
        else if (progress < 85) setLoadingStage("GENERATING BRIEF");
        else setLoadingStage("FINALIZING");

      }, 50); // 20 ticks per second

      return () => clearInterval(interval);
    }
  }, [scanningTarget, report]);


  // 2. LOADING STATE (Floating HUD - No Background)
  if (scanningTarget && !report) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center print:hidden"
      >
        {/* Floating Container - No Background, completely transparent */}
        <div className="relative w-full max-w-lg flex flex-col items-center justify-center p-8">

          {/* Center Reticle Brackets - Subtle framing of the Black Hole */}
          <div className="absolute top-0 left-0 w-16 h-16 border-l border-t border-cyan-500/30"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-r border-t border-cyan-500/30"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-l border-b border-cyan-500/30"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-r border-b border-cyan-500/30"></div>

          <div className="flex flex-col items-center space-y-6 w-full">

            {/* Target Identity */}
            <div className="flex flex-col items-center space-y-2">
              <span className="text-cyan-400 font-mono text-[9px] tracking-[0.4em] uppercase opacity-80 animate-pulse">
                {loadingStage}
              </span>
              <h2 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 uppercase tracking-tight leading-none text-center drop-shadow-[0_0_15px_rgba(0,0,0,1)]">
                {scanningTarget}
              </h2>
            </div>

            {/* Numeric Progress - Large & Thin */}
            <div className="font-mono text-6xl md:text-8xl font-thin text-cyan-50/20 tabular-nums leading-none tracking-tighter">
              {loadingProgress.toFixed(0)}%
            </div>

            {/* The "True" Loading Bar - Thin Filament */}
            <div className="w-full max-w-xs h-[1px] bg-cyan-900/50 relative overflow-visible">
              {/* The Active Bar */}
              <motion.div
                className="absolute top-0 left-0 h-[1px] bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
                style={{ width: `${loadingProgress}%` }}
              >
                {/* Leading Edge Spark */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"></div>
              </motion.div>
            </div>

            {/* Bottom Data Stream */}
            <div className="h-4 overflow-hidden flex flex-col items-center">
              <div className="text-[8px] font-mono text-cyan-500/60 uppercase tracking-widest animate-[pulse_0.5s_infinite]">
                Reading Sector {Math.floor(loadingProgress * 42)}...
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    );
  }

  // 3. IDLE STATE
  if (!report) return null;

  // 4. REPORT STATE
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute inset-0 z-20 pointer-events-none flex justify-center print:hidden"
      >
        {/* COMPACTED VIEWPORT CONTAINER - Content centered, gradient extends to bottom */}
        <div className="w-full max-w-[1600px] h-full relative flex flex-col justify-center pt-5 px-5 md:pt-10 md:px-10 pb-0">

          {/* FULL-HEIGHT GRADIENT BACKGROUND - Extends to viewport bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none z-0"></div>

          {/* BACKGROUND GRID LINES (Subtle) */}
          <div className="absolute inset-0 z-0 opacity-10 pointer-events-none border-x border-white/10 mx-5 md:mx-10">
            <div className="w-full h-full grid grid-cols-4 border-r border-white/10"></div>
          </div>

          {/* TOP HEADER - CONTEXT */}
          <div className="w-full flex justify-between items-start pointer-events-auto mb-auto">
            <div className="flex flex-col">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-2 h-2 bg-cyan-500 animate-pulse"></div>
                <span className="text-cyan-500 font-mono text-xs tracking-[0.3em] uppercase">Executive Intelligence Brief</span>
              </div>
              {/* MASSIVE TARGET NAME */}
              <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-600 uppercase tracking-tighter leading-none">
                {report.target_name}
              </h1>
            </div>

            <div className="flex flex-col items-end">
              <div className={`px-4 py-1 mb-2 font-mono text-xs font-bold tracking-widest uppercase ${report.confidence.band === 'HIGH' ? 'bg-green-500 text-black' :
                report.confidence.band === 'MEDIUM' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'
                }`}>
                {report.confidence.band} CONFIDENCE
              </div>
              <span className="text-gray-500 font-mono text-[10px] tracking-widest">{new Date().toLocaleDateString()} // {report.intent.context_label}</span>
            </div>
          </div>


          {/* BOTTOM MAG - 12 COLUMN GRID RESTRUCTURED. Has inline gradient for text readability + positioned above the full-height gradient */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end pointer-events-auto border-t border-white/20 pt-8 pb-24 relative z-10 mt-auto bg-gradient-to-t from-black via-black/90 to-transparent">

            {/* LEFT PRIMARY BLOCK (Cols 1-7): Frame + Directive */}
            <div className="md:col-span-7 flex flex-col space-y-6">

              <div className="space-y-4">
                <span className="text-cyan-400 font-mono text-[10px] uppercase tracking-[0.2em] block border-l-2 border-cyan-500 pl-2">Strategic Frame</span>
                <p className="text-lg md:text-xl font-light text-white leading-relaxed">
                  {report.frame.sentence}
                </p>
              </div>

              {/* 2. DIRECTIVE (Moved from Right, Left Aligned) */}
              <div className="flex flex-col items-start text-left">
                <span className="text-orange-500 font-mono text-[10px] uppercase tracking-[0.2em] block mb-2">Operational Directive</span>
                <h2 className="text-lg md:text-xl font-bold text-white mb-4 leading-tight max-w-4xl">
                  {report.strategy.recommended_move}
                </h2>
                <div className="bg-orange-900/10 border border-orange-500/20 p-4 w-full mb-4">
                  <span className="text-orange-400 font-mono text-[9px] uppercase block mb-1">Flip Condition</span>
                  <p className="text-orange-200/60 text-xs italic">"{report.strategy.flip_condition}"</p>
                </div>

                <button
                  onClick={() => setShowDossier(true)}
                  className={`group flex items-center gap-3 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest transition-all relative overflow-hidden ${deepDossier?.is_ready
                    ? "bg-white text-black hover:bg-cyan-400"
                    : "bg-gray-900 text-gray-400 border border-white/10"
                    }`}
                >
                  {/* LOADING STATE BACKGROUND */}
                  {!deepDossier?.is_ready && (
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 animate-pulse"></div>
                  )}

                  {/* SHIMMER EFFECT FOR LOADED STATE */}
                  {deepDossier?.is_ready && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                  )}

                  <div className="flex items-center gap-3 relative z-10">
                    {deepDossier?.is_ready ? (
                      <>
                        <span>Open Strategic Audit</span>
                        <span className="bg-black text-white w-4 h-4 flex items-center justify-center text-[10px] rounded-full group-hover:bg-black/50">+</span>
                      </>
                    ) : (
                      <>
                        <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin"></span>
                        <span>Compiling Deep Audit...</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* RIGHT SECONDARY BLOCK (Cols 8-12): Context Column (Sidebar style) */}
            <div className="md:col-span-5 flex flex-col space-y-8 items-end text-right border-l border-white/10 pl-8">

              {/* MOVED: WHAT CHANGED */}
              <div className="w-full flex flex-col items-end">
                <span className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.2em] block mb-1">Context Shift</span>
                <p className="text-xs md:text-sm text-gray-400 italic leading-relaxed">
                  "{report.frame.what_changed}"
                </p>
              </div>

              <div className="w-full flex flex-col items-end">
                <span className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.2em] block mb-1">Projected Path</span>
                <p className="text-sm text-gray-300 border-r border-gray-700 pr-3 py-1">
                  {report.scenarios.most_likely}
                </p>
              </div>
              <div className="w-full flex flex-col items-end">
                <span className="text-red-500 font-mono text-[10px] uppercase tracking-[0.2em] block mb-1">Tail Risk</span>
                <p className="text-sm text-red-200/80 border-r border-red-900 pr-3 py-1">
                  {report.scenarios.second_most_dangerous}
                </p>
              </div>
            </div>

          </div>
        </div>

      </motion.div>

      {/* FULL DOSSIER MODAL */}
      <AnimatePresence>
        {showDossier && <DossierModal report={report} deepDossier={deepDossier} onClose={() => setShowDossier(false)} />}
      </AnimatePresence>
    </>
  );
};

export default IntelDisplay;