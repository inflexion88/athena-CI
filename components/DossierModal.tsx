import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ExecutiveBrief, DeepDossier } from '../types';

interface DossierModalProps {
  report: ExecutiveBrief;
  deepDossier: DeepDossier | null;
  onClose: () => void;
}

const DossierModal: React.FC<DossierModalProps> = ({ report, deepDossier, onClose }) => {
  // Loading Text Cycle
  const [loadingText, setLoadingText] = useState("Initializing Secure Handshake...");
  
  useEffect(() => {
    if (!deepDossier?.is_ready) {
      const texts = [
        "Parsing 10-K Filings...",
        "Cross-referencing Market Cap...",
        "Analyzing Competitor Velocity...",
        "Synthesizing Strategic Alpha...",
        "Finalizing Red Team Assessment..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingText(texts[i % texts.length]);
        i++;
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [deepDossier?.is_ready]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8 print:p-0 print:bg-white print:static print:block"
    >
      {/* GLOBAL PRINT OVERRIDES */}
      <style>{`
        @media print {
          @page { size: auto; margin: 15mm; }
          html, body, #root { 
            height: auto !important; 
            overflow: visible !important; 
            background: white !important;
          }
          body > * { display: none !important; }
          body > #root { display: block !important; }
          /* Hide BlackHole Canvas specifically */
          canvas { display: none !important; }
          /* Ensure text is black */
          * { color: black !important; text-shadow: none !important; }
          /* Show backgrounds for charts/metrics if needed */
          div { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* APP SHELL CONTAINER */}
      <div className="w-full h-full max-w-5xl bg-[#111] flex flex-col shadow-2xl rounded-sm overflow-hidden border border-[#333] relative print:shadow-none print:border-none print:bg-white print:h-auto print:overflow-visible print:block">
        
        {/* APP HEADER (Dark Mode UI) */}
        <header className="h-16 bg-[#09090b] border-b border-[#222] flex items-center justify-between px-6 shrink-0 print:hidden z-20 relative">
           <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="font-mono text-xs font-bold text-gray-200 uppercase tracking-widest">
                Strategic Intelligence
              </span>
           </div>
           
           <div className="flex items-center gap-6">
              <button 
                onClick={handlePrint}
                disabled={!deepDossier?.is_ready}
                className={`flex items-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest transition-colors ${
                  deepDossier?.is_ready ? 'text-white hover:text-cyan-400' : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                 </svg>
                 {deepDossier?.is_ready ? "Export PDF" : "Processing..."}
              </button>
              
              <div className="h-4 w-px bg-[#333]"></div>

              <button 
                onClick={onClose}
                className="group flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#222] transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
           </div>
        </header>

        {/* MAIN SCROLLABLE AREA */}
        <div className="flex-1 overflow-y-auto bg-[#1a1a1a] relative custom-scrollbar print:bg-white print:overflow-visible print:h-auto print:block">
          
          {/* BACKGROUND TEXTURE */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] print:hidden"></div>

          {/* LOADING STATE */}
          {!deepDossier?.is_ready && (
             <div className="absolute inset-0 flex flex-col items-center justify-center z-10 print:hidden">
                <div className="w-64 h-1 bg-[#333] rounded-full overflow-hidden mb-4">
                   <motion.div 
                     className="h-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]"
                     initial={{ width: "0%" }}
                     animate={{ width: "100%" }}
                     transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                   />
                </div>
                <p className="font-mono text-xs text-cyan-500 uppercase tracking-widest animate-pulse">
                   {loadingText}
                </p>
             </div>
          )}

          {/* DOCUMENT PAPER SURFACE */}
          {deepDossier?.is_ready && (
            <div className="max-w-[850px] mx-auto my-8 bg-white text-gray-900 min-h-[1100px] shadow-[0_0_50px_rgba(0,0,0,0.5)] p-12 md:p-16 relative print:shadow-none print:m-0 print:p-0 print:w-full print:max-w-none animate-in fade-in slide-in-from-bottom-4 duration-700 font-serif">
               
               {/* FORMAL MASTHEAD */}
               <div className="border-b-4 border-black pb-4 mb-8 flex justify-between items-end">
                   <div>
                       <div className="font-sans font-black text-xs uppercase tracking-[0.3em] mb-2">Strategic Intelligence Division</div>
                       <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                           System Ver. 2.1.0 // Auth: AUTO-G
                       </div>
                   </div>
                   <div className="text-right">
                       <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-1">Date</div>
                       <div className="font-sans font-bold text-sm">{new Date().toLocaleDateString()}</div>
                   </div>
               </div>

               {/* DOCUMENT HEADER */}
               <div className="mb-12">
                  <div className="mb-8">
                     <h1 className="font-sans text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[0.9] mb-4 text-black">
                        {report.target_name}
                     </h1>
                     <p className="font-serif text-xl italic text-gray-600 border-l-4 border-gray-200 pl-4">
                        Strategic Assessment & Risk Profile
                     </p>
                  </div>
                  
                  {/* RIGID SPECIFICATION GRID */}
                  <div className="border-y-2 border-black grid grid-cols-3 divide-x-2 divide-black">
                      <div className="p-4">
                         <span className="block font-sans text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Sector Context</span>
                         <span className="block font-sans font-bold text-sm uppercase text-black">{report.intent.context_label}</span>
                      </div>
                      <div className="p-4">
                         <span className="block font-sans text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Risk Band</span>
                         <span className={`block font-sans font-bold text-sm uppercase ${
                             report.confidence.band === 'HIGH' ? 'text-black' : 
                             report.confidence.band === 'MEDIUM' ? 'text-black' : 'text-red-600'
                         }`}>
                             {report.confidence.band} Risk
                         </span>
                      </div>
                      <div className="p-4">
                         <span className="block font-sans text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Primary Intent</span>
                         <span className="block font-sans font-bold text-sm uppercase text-black">{report.intent.type}</span>
                      </div>
                  </div>
               </div>

               {/* CONTENT BODY */}
               <div className="space-y-12">
                  
                  {/* 1. EXECUTIVE SUMMARY */}
                  <section>
                      <h2 className="font-sans text-xs font-black text-black uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 flex items-center gap-2">
                         <span className="bg-black text-white px-1">01</span> Executive Judgment
                      </h2>
                      <div className="text-lg md:text-xl font-serif leading-relaxed text-gray-900 font-medium text-justify">
                          {deepDossier.sections.find(s => s.title.includes("SUMMARY"))?.content.map((p, i) => (
                             <p key={i} className="mb-6 first-letter:float-left first-letter:text-5xl first-letter:font-black first-letter:pr-3 first-letter:mt-[-6px] first-letter:font-sans">
                                {p}
                             </p>
                          ))}
                      </div>
                  </section>

                  {/* 2. DYNAMIC SECTIONS */}
                  {deepDossier.sections.filter(s => !s.title.includes("SUMMARY")).map((section, idx) => (
                      <section key={idx} className="break-inside-avoid">
                          <h2 className="font-sans text-xs font-black text-black uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 flex items-center gap-2">
                             <span className="bg-gray-200 text-black px-1">0{idx + 2}</span> {section.title}
                          </h2>
                          
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                             
                             {/* TEXT CONTENT (8 Cols) */}
                             <div className="md:col-span-8 font-serif text-sm leading-7 text-gray-800 text-justify">
                                 {section.content.map((p, i) => <p key={i} className="mb-4">{p}</p>)}
                             </div>

                             {/* METRICS SIDEBAR (4 Cols) */}
                             <div className="md:col-span-4 space-y-4">
                                 {section.metrics.length > 0 && (
                                     <div className="break-inside-avoid">
                                         <h3 className="font-sans text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-4">
                                            Signal Intelligence
                                         </h3>
                                         <div className="space-y-2">
                                            {section.metrics.map((m, k) => (
                                                <div key={k} className="bg-[#111] text-white p-4 shadow-md border-l-4 border-gray-400">
                                                   <div className="text-[9px] font-mono uppercase tracking-wider opacity-70 mb-1">{m.label}</div>
                                                   <div className="text-xl font-bold font-sans tracking-tight">{m.value}</div>
                                                </div>
                                            ))}
                                         </div>
                                     </div>
                                 )}
                             </div>
                          </div>
                      </section>
                  ))}

                  {/* SOURCES FOOTER */}
                  <div className="pt-12 mt-12 border-t border-black">
                      <h4 className="font-sans text-[9px] font-bold uppercase mb-6 text-gray-500 tracking-widest">Reference Links</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8">
                          {deepDossier.sources.map((source, i) => (
                              <div key={i} className="flex gap-3 items-baseline group">
                                  <span className="font-mono text-[9px] text-gray-400">[{i+1}]</span>
                                  <a href={source} target="_blank" rel="noreferrer" className="text-[10px] text-gray-600 font-mono truncate hover:text-black underline decoration-gray-300 hover:decoration-black transition-all">
                                     {source}
                                  </a>
                              </div>
                          ))}
                      </div>
                  </div>
                  
                  {/* PRINT FOOTER */}
                  <div className="hidden print:block mt-8 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                          <span className="font-mono text-[8px] text-gray-400 uppercase tracking-widest">
                              Generated by Autonomous Intelligence Grid // {new Date().toISOString()}
                          </span>
                      </div>
                  </div>

               </div>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
};

export default DossierModal;