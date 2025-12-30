
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Conversation } from '@11labs/client';
import BlackHole from './components/BlackHole';
import IntelDisplay from './components/IntelDisplay';
import { generateExecutiveBrief, generateDeepDossier } from './geminiService';
import { ExecutiveBrief, DeepDossier, UIState } from './types';

// Extend Window interface for the Process hack
declare global {
    interface Window {
        process: any;
    }
}

const App: React.FC = () => {
    const [uiState, setUiState] = useState<UIState>(UIState.IDLE);
    const [briefData, setBriefData] = useState<ExecutiveBrief | null>(null);
    const [deepDossier, setDeepDossier] = useState<DeepDossier | null>(null);
    const [scanningTarget, setScanningTarget] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [conversation, setConversation] = useState<any>(null);
    const [mountError, setMountError] = useState<string | null>(null);
    const [targetUrl, setTargetUrl] = useState("");

    // Ref pattern to allow tools to access fresh state without closures
    const briefDataRef = useRef<ExecutiveBrief | null>(null);
    const targetUrlRef = useRef(targetUrl);

    useEffect(() => {
        briefDataRef.current = briefData;
    }, [briefData]);

    useEffect(() => {
        targetUrlRef.current = targetUrl;
    }, [targetUrl]);

    // Tool 1: Scan (The Eye)
    const scanCompetitor = useCallback(async (params: { name: string; url?: string }) => {
        console.log("TOOL CALLED: scan_competitor", params);
        setUiState(UIState.ANALYZING);
        setScanningTarget(params.name.toUpperCase());
        setDeepDossier(null); // Reset deep dossier

        try {
            // 1. Fast Path: Executive Brief
            const brief = await generateExecutiveBrief(params.name, params.url);
            setBriefData(brief);
            setUiState(UIState.SPEAKING);
            setScanningTarget(null); // Clear loading text once data is ready

            // 2. Slow Path: Fire & Forget Deep Dossier (Background)
            generateDeepDossier(params.name).then(dossier => {
                console.log("Deep Dossier Ready");
                setDeepDossier(dossier);
            });

            // Return script for agent
            return `
        Here is the strategic frame: ${brief.frame.sentence}
        
        Situation Report: ${brief.frame.what_changed} This is critical because ${brief.frame.why_it_matters}
        
        Scenario Analysis. 
        The Base Case is ${brief.scenarios.most_likely}
        The Risk Case is ${brief.scenarios.second_most_dangerous}
        
        My Directive is as follows:
        I recommend you ${brief.strategy.recommended_move}
        Alternatively, you could ${brief.strategy.alternative_move}
        
        Priority Watchlist items are: ${brief.strategy.watchlist.slice(0, 2).join(", ")}.
        I will pivot my assessment if ${brief.strategy.flip_condition}.
        
        My confidence level is ${brief.confidence.band}. 
        ${brief.confidence.band !== 'HIGH' ? `I need to resolve the following signals: ${brief.confidence.resolving_signals.join(", ")}` : ''}
      `;
        } catch (e: any) {
            console.error("Scan failed", e);
            setUiState(UIState.IDLE);
            setScanningTarget(null);
            // RETURN ERROR TO AGENT so it speaks it, rather than faking it.
            return `SYSTEM ALERT: Intelligence acquisition failed. Error: ${e.message || "Unknown Server Error"}. Check API Keys.`;
        }
    }, []);

    // Tool 2: Deep Dive (The Memory)
    const consultDossier = useCallback(async (params: { topic: string }) => {
        console.log("TOOL CALLED: consult_dossier", params);
        const brief = briefDataRef.current;

        if (!brief) return "No active dossier. Please scan a target first.";

        const query = params.topic.toLowerCase();

        // Heuristic retrieval from the JSON
        if (query.includes('evidence') || query.includes('proof') || query.includes('signal')) {
            const signals = brief.dossier.key_signals.map(s => `${s.bucket}: ${s.content}`).join("\n");
            return `EVIDENCE RETRIEVED:\n${signals}`;
        }

        if (query.includes('risk') || query.includes('fail') || query.includes('bad')) {
            return `RISK DETAIL: ${brief.scenarios.second_most_dangerous}. WATCHLIST: ${brief.strategy.watchlist.join(", ")}`;
        }

        if (query.includes('move') || query.includes('strategy') || query.includes('recommend')) {
            return `STRATEGY DETAIL: Recommended: ${brief.strategy.recommended_move}. Alternative: ${brief.strategy.alternative_move}. Condition: ${brief.strategy.flip_condition}`;
        }

        // Default Fallback
        return `DOSSIER SUMMARY: Frame: ${brief.frame.sentence}. Evidence count: ${brief.dossier.key_signals.length}. Request specific evidence or risks.`;
    }, []);

    const startConversation = async () => {
        try {
            setUiState(UIState.THINKING);
            setBriefData(null); // Clear previous session data
            setDeepDossier(null);
            setScanningTarget(null);

            const conv = await Conversation.startSession({
                agentId: window.process.env.ELEVENLABS_AGENT_ID,
                clientTools: {
                    scan_competitor: scanCompetitor,
                    consult_dossier: consultDossier // Register new tool
                },
                onConnect: async () => {
                    console.log("ElevenLabs Connected");
                    setIsConnected(true);
                    setUiState(UIState.IDLE);
                },
                onDisconnect: () => {
                    console.log("ElevenLabs Disconnected");
                    setIsConnected(false);
                    setUiState(UIState.IDLE);
                    // CLEANUP UI ARTIFACTS
                    setBriefData(null);
                    setDeepDossier(null);
                    setScanningTarget(null);
                    setTargetUrl(""); // Reset input
                },
                onError: (error: any) => {
                    console.error("ElevenLabs Error:", error);
                    setMountError("Connection Error: " + (error?.message || "Unknown"));
                    setUiState(UIState.IDLE);
                    setBriefData(null);
                    setDeepDossier(null);
                },
                onModeChange: (mode: { mode: string }) => {
                    if (mode.mode === 'speaking') {
                        setUiState(UIState.SPEAKING);
                    } else if (mode.mode === 'listening') {
                        setUiState(UIState.LISTENING);
                    }
                }
            } as any);

            setConversation(conv);

            // TACTICAL TRIGGER: Send text to agent to simulate voice input
            if (targetUrlRef.current) {
                console.log("Attempting to trigger agent with URL:", targetUrlRef.current);
                const prompt = `Analyze ${targetUrlRef.current}`;

                // Allow session to stabilize
                await new Promise(resolve => setTimeout(resolve, 1000));

                // @ts-ignore
                if (typeof conv.sendText === 'function') {
                    console.log("Using sendText trigger");
                    // @ts-ignore
                    await conv.sendText(prompt);
                }
                // @ts-ignore
                else if (typeof conv.sendMessage === 'function') {
                    console.log("Using sendMessage trigger");
                    // @ts-ignore
                    await conv.sendMessage(prompt);
                }
                else {
                    console.warn("No text trigger method found. Falling back to manual execution (Visuals Only).");
                    scanCompetitor({ name: targetUrlRef.current });
                }
            }

        } catch (error: any) {
            console.error("Failed to start conversation:", error);
            setUiState(UIState.IDLE);
            setMountError("Initialization Failed: " + error.message);
        }
    };

    const endConversation = async () => {
        if (conversation) {
            await conversation.endSession();
            setConversation(null);
        }
    };

    return (
        <div className="relative w-full h-full bg-black overflow-hidden font-sans">

            {/* 1. Immersive Visual Layer */}
            <BlackHole state={uiState} />

            {/* 2. Intel Overlay Layer */}
            <IntelDisplay
                report={briefData}
                deepDossier={deepDossier}
                scanningTarget={scanningTarget}
            />

            {/* 3. Control Layer */}
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                    {!isConnected ? (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { duration: 0.5 } }}
                            className="pointer-events-auto flex flex-col items-center justify-center z-50 relative"
                        >
                            {/* ATHENA INTRO HEADLINE - FIXED TOP POSITION */}
                            <div className="fixed top-24 left-0 w-full flex flex-col items-center text-center space-y-4 z-50 px-4 pointer-events-none">
                                <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]">
                                    Hi, I'm Athena.
                                </h1>
                                <p className="text-lg md:text-xl text-gray-200 font-sans font-light drop-shadow-md">
                                    Your Competitive Intelligence Companion
                                </p>
                            </div>

                            {/* White Glow Orb/Button - DEAD CENTER - CLICKABLE */}
                            <div
                                onClick={startConversation}
                                className="cursor-pointer group flex flex-col items-center justify-center"
                            >
                                <div className="w-16 h-16 rounded-full bg-white shadow-[0_0_50px_rgba(255,255,255,0.8)] mb-6 animate-pulse group-hover:scale-110 transition-transform duration-500"></div>

                                <span className="text-black font-bold text-lg tracking-widest bg-white/90 px-6 py-2 shadow-[0_0_30px_rgba(255,255,255,0.6)] transition-all group-hover:bg-white group-hover:shadow-[0_0_50px_rgba(255,255,255,0.9)]">
                                    CLICK HERE TO BEGIN
                                </span>
                                <span className="mt-2 text-xs text-gray-500 tracking-[0.4em] uppercase opacity-70">
                                    Initialize Intelligence
                                </span>
                            </div>

                            {/* TACTICAL INPUT FIELD */}
                            <div className="mt-8 relative w-64 group/input">
                                <div className="absolute inset-x-0 bottom-0 h-px bg-gray-700 group-focus-within/input:bg-cyan-500 transition-colors"></div>
                                <input
                                    type="text"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && startConversation()}
                                    placeholder="ENTER TARGET URL..."
                                    className="w-full bg-transparent text-center font-mono text-cyan-500 text-sm uppercase tracking-widest placeholder:text-gray-800 focus:outline-none py-2"
                                />
                                {/* DECORATIVE CORNERS */}
                                <div className="absolute bottom-0 left-0 w-1 h-1 bg-gray-700 group-focus-within/input:bg-cyan-500 transition-colors"></div>
                                <div className="absolute bottom-0 right-0 w-1 h-1 bg-gray-700 group-focus-within/input:bg-cyan-500 transition-colors"></div>
                            </div>

                            {/* DYNAMIC BUTTON TEXT based on Input */}
                            {targetUrl && (
                                <div
                                    onClick={startConversation}
                                    className="mt-4 animate-pulse text-[10px] text-cyan-500 uppercase tracking-widest font-mono cursor-pointer hover:text-cyan-400"
                                >
                                    &gt;&gt; READY TO EXECUTE
                                </div>
                            )}

                            {mountError && (
                                <div className="mt-4 text-red-500 bg-red-900/20 px-4 py-2 text-xs border border-red-900/50 absolute top-full mt-4">
                                    {mountError}
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="controls"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bottom-10 pointer-events-auto"
                        >
                            <button
                                onClick={endConversation}
                                className="text-red-500 text-xs font-bold tracking-[0.2em] border border-red-900/50 px-6 py-3 hover:bg-red-900/20 transition-all bg-black/80 backdrop-blur uppercase"
                            >
                                TERMINATE UPLINK
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Status Indicators (Corner) */}
            <div className="absolute top-6 left-6 z-40 flex flex-col space-y-2 pointer-events-none print:hidden">
                <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#00ff00]' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] text-gray-400 tracking-widest uppercase">
                        {isConnected ? 'SYSTEM ONLINE' : 'OFFLINE'}
                    </span>
                </div>
            </div>

            {/* MOBILE BLOCKER - FORCES DESKTOP */}
            <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 text-center md:hidden">
                <div className="w-16 h-16 border-2 border-red-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-4">
                    Secure Terminal Required
                </h2>
                <p className="text-sm text-gray-400 font-mono tracking-wider leading-relaxed">
                    This intelligence platform requires a high-resolution desktop interface for data visualization.
                    <br /><br />
                    <span className="text-red-500">MOBILE CONNECTION REJECTED</span>
                </p>
            </div>

        </div>
    );
};

export default App;
