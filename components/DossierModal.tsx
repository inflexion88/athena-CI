import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ExecutiveBrief, DeepDossier } from '../types';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface DossierModalProps {
   report: ExecutiveBrief;
   deepDossier: DeepDossier | null;
   onClose: () => void;
}

const DossierModal: React.FC<DossierModalProps> = ({ report, deepDossier, onClose }) => {
   const [loadingText, setLoadingText] = useState("Initializing Secure Handshake...");
   const contentRef = useRef<HTMLDivElement>(null);
   const [isDownloading, setIsDownloading] = useState(false);

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

   const handleDownload = async () => {
      if (!contentRef.current) return;
      setIsDownloading(true);

      const element = contentRef.current;

      // Configuration for "Light Mode" High Fidelity PDF
      const opt = {
         margin: [15, 15, 15, 15], // Standard document margins
         filename: `${report.target_name.replace(/\s+/g, '_')}_STRATEGIC_AUDIT.pdf`,
         image: { type: 'jpeg', quality: 0.98 },
         html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            letterRendering: true,
            scrollY: 0,
            windowWidth: 1200, // Force desktop render width
         },
         jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
         pagebreak: { mode: ['css', 'legacy'] } // Rely on specific break classes
      };

      try {
         await html2pdf().set(opt).from(element).save();
      } catch (err) {
         console.error("PDF Generation Failed", err);
         alert("Download failed. Please try again.");
      } finally {
         setIsDownloading(false);
      }
   };

   return (
      <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8"
      >

         {/* APP SHELL CONTAINER (LIGHT MODE) */}
         <div className="w-full h-full max-w-5xl bg-gray-50 flex flex-col shadow-2xl rounded-sm overflow-hidden border border-gray-200 relative">

            {/* APP HEADER */}
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-20 relative">
               <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                  <span className="font-mono text-xs font-bold text-gray-900 uppercase tracking-widest">
                     Strategic Intelligence
                  </span>
               </div>

               <div className="flex items-center gap-6">
                  <button
                     onClick={handleDownload}
                     disabled={!deepDossier?.is_ready || isDownloading}
                     className={`flex items-center gap-2 text-[10px] font-bold font-mono uppercase tracking-widest transition-colors ${deepDossier?.is_ready && !isDownloading ? 'text-black hover:text-cyan-600' : 'text-gray-400 cursor-not-allowed'
                        }`}
                  >
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                     </svg>
                     {isDownloading ? "GENERATING PDF..." : "DOWNLOAD DOSSIER"}
                  </button>

                  <div className="h-4 w-px bg-gray-300"></div>

                  <button
                     onClick={onClose}
                     className="group flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200 transition-colors"
                  >
                     <svg className="w-5 h-5 text-gray-500 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                  </button>
               </div>
            </header>

            {/* MAIN SCROLLABLE AREA */}
            <div className="flex-1 overflow-y-auto bg-gray-100 relative custom-scrollbar">

               {/* LOADING STATE */}
               {!deepDossier?.is_ready && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 backdrop-blur-sm">
                     <div className="w-64 h-1 bg-gray-200 rounded-full overflow-hidden mb-4">
                        <motion.div
                           className="h-full bg-black"
                           initial={{ width: "0%" }}
                           animate={{ width: "100%" }}
                           transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        />
                     </div>
                     <p className="font-mono text-xs text-black uppercase tracking-widest animate-pulse">
                        {loadingText}
                     </p>
                  </div>
               )}

               {/* DOCUMENT PAPER SURFACE (THE PART TO BE DOWNLOADED) */}
               {deepDossier?.is_ready && (
                  <div ref={contentRef} className="max-w-[850px] mx-auto my-8 bg-white text-gray-900 min-h-[1100px] p-12 md:p-16 relative font-serif border border-gray-200">

                     {/* FORMAL MASTHEAD - LIGHT MODE */}
                     <div className="border-b-4 border-black pb-4 mb-8 flex justify-between items-end">
                        <div>
                           <div className="font-sans font-black text-xs uppercase tracking-[0.3em] mb-2 text-black">Strategic Intelligence Division</div>
                           <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                              System Ver. 2.1.0 // Auth: AUTO-G
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-1">Date</div>
                           <div className="font-sans font-bold text-sm text-black">{new Date().toLocaleDateString()}</div>
                        </div>
                     </div>

                     {/* DOCUMENT HEADER */}
                     <div className="mb-12">
                        <div className="mb-8">
                           {/* RELAXED LEADING FOR PDF SAFETY */}
                           <h1 className="font-sans text-5xl md:text-6xl font-black uppercase tracking-tighter leading-tight mb-4 text-black">
                              {report.target_name}
                           </h1>
                           <p className="font-serif text-xl italic text-gray-600 border-l-4 border-black pl-4">
                              Strategic Assessment & Risk Profile
                           </p>
                        </div>

                        {/* RIGID SPECIFICATION GRID */}
                        <div className="border-y-2 border-black grid grid-cols-3 divide-x-2 divide-gray-200">
                           <div className="p-4">
                              <span className="block font-sans text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Sector Context</span>
                              <span className="block font-sans font-bold text-sm uppercase text-gray-900 break-words">{report.intent.context_label}</span>
                           </div>
                           <div className="p-4">
                              <span className="block font-sans text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Risk Band</span>
                              <span className={`block font-sans font-bold text-sm uppercase ${report.confidence.band === 'HIGH' ? 'text-green-700' :
                                 report.confidence.band === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
                                 }`}>
                                 {report.confidence.band} Risk
                              </span>
                           </div>
                           <div className="p-4">
                              <span className="block font-sans text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Primary Intent</span>
                              <span className="block font-sans font-bold text-sm uppercase text-gray-900">{report.intent.type}</span>
                           </div>
                        </div>
                     </div>

                     {/* CONTENT BODY */}
                     <div className="space-y-12">

                        {/* 1. EXECUTIVE SUMMARY */}
                        <section className="html2pdf__page-break">
                           <h2 className="font-sans text-xs font-black text-black uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 flex items-center gap-2">
                              {/* SIMPLIFIED HEADER FOR PDF SAFETY */}
                              <span className="text-black font-bold mr-2">01</span> Executive Judgment
                           </h2>
                           <div className="text-lg md:text-xl font-serif leading-relaxed text-gray-800 font-medium text-justify">
                              {/* MARKDOWN RENDERER */}
                              {deepDossier.sections.find(s => s.title.includes("SUMMARY"))?.content.map((p, i) => (
                                 <div key={i} className="mb-6">
                                    <ReactMarkdown
                                       components={{
                                          strong: ({ node, ...props }) => <span className="font-bold text-black" {...props} />,
                                          em: ({ node, ...props }) => <span className="italic text-gray-700" {...props} />,
                                       }}
                                    >
                                       {p}
                                    </ReactMarkdown>
                                 </div>
                              ))}
                           </div>
                        </section>

                        {/* 2. DYNAMIC SECTIONS */}
                        {deepDossier.sections.filter(s => !s.title.includes("SUMMARY")).map((section, idx) => (
                           <section key={idx} className="html2pdf__page-break">
                              <h2 className="font-sans text-xs font-black text-black uppercase tracking-[0.2em] mb-6 border-b border-gray-200 pb-2 flex items-center gap-2">
                                 <span className="text-gray-500 font-bold mr-2">0{idx + 2}</span> {section.title}
                              </h2>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                                 {/* TEXT CONTENT (8 Cols) */}
                                 <div className="md:col-span-8 font-serif text-sm leading-7 text-gray-700 text-justify">
                                    {section.content.map((p, i) => (
                                       <div key={i} className="mb-4">
                                          <ReactMarkdown
                                             components={{
                                                strong: ({ node, ...props }) => <span className="font-bold text-gray-900" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                                             }}
                                          >
                                             {p}
                                          </ReactMarkdown>
                                       </div>
                                    ))}
                                 </div>

                                 {/* METRICS SIDEBAR (4 Cols) */}
                                 <div className="md:col-span-4 space-y-4">
                                    {section.metrics.length > 0 && (
                                       <div>
                                          <h3 className="font-sans text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-4">
                                             Signal Intelligence
                                          </h3>
                                          <div className="space-y-2">
                                             {section.metrics.map((m, k) => (
                                                <div key={k} className="bg-gray-50 text-gray-900 p-4 border-l-4 border-gray-400">
                                                   <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500 mb-1">{m.label}</div>
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
                        <div className="pt-12 mt-12 border-t border-gray-200 html2pdf__page-break">
                           <h4 className="font-sans text-[9px] font-bold uppercase mb-6 text-gray-500 tracking-widest">Reference Links</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8">
                              {deepDossier.sources.map((source, i) => (
                                 <div key={i} className="flex gap-3 items-baseline group">
                                    <span className="font-mono text-[9px] text-gray-400">[{i + 1}]</span>
                                    <a href={source} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 font-mono truncate hover:text-black underline decoration-gray-300 hover:decoration-black transition-all">
                                       {source}
                                    </a>
                                 </div>
                              ))}
                           </div>
                        </div>

                        {/* GENERATION FOOTER */}
                        <div className="mt-8 pt-4 border-t border-gray-100">
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