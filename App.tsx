
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  // Ref pattern to allow tools to access fresh state without closures
  const briefDataRef = useRef<ExecutiveBrief | null>(null);
  useEffect(() => {
    briefDataRef.current = briefData;
  }, [briefData]);

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
        FRAME: ${brief.frame.sentence}
        
        SITUATION: ${brief.frame.what_changed} ${brief.frame.why_it_matters}
        
        SCENARIOS:
        Base Case: ${brief.scenarios.most_likely}
        Risk Case: ${brief.scenarios.second_most_dangerous}
        
        DIRECTIVE:
        Recommended Move: ${brief.strategy.recommended_move}
        Backup Move: ${brief.strategy.alternative_move}
        
        WATCHLIST: ${brief.strategy.watchlist.slice(0, 2).join(", ")}.
        FLIP CONDITION: I will pivot if ${brief.strategy.flip_condition}.
        
        CONFIDENCE: ${brief.confidence.band}. 
        ${brief.confidence.band !== 'HIGH' ? `Resolving signals needed: ${brief.confidence.resolving_signals.join(", ")}` : ''}
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
        onConnect: () => {
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
        {!isConnected ? (
          <div
            onClick={startConversation}
            className="pointer-events-auto cursor-pointer group flex flex-col items-center justify-center z-50"
          >
            {/* White Glow Orb/Button */}
            <div className="w-16 h-16 rounded-full bg-white shadow-[0_0_50px_rgba(255,255,255,0.8)] mb-6 animate-pulse group-hover:scale-110 transition-transform duration-500"></div>

            <span className="text-black font-bold text-lg tracking-widest bg-white/90 px-6 py-2 shadow-[0_0_30px_rgba(255,255,255,0.6)] transition-all group-hover:bg-white group-hover:shadow-[0_0_50px_rgba(255,255,255,0.9)]">
              CLICK HERE TO BEGIN
            </span>
            <span className="mt-2 text-xs text-gray-500 tracking-[0.4em] uppercase opacity-70">
              Initialize Intelligence
            </span>

            {mountError && (
              <div className="mt-4 text-red-500 bg-red-900/20 px-4 py-2 text-xs border border-red-900/50">
                {mountError}
              </div>
            )}
          </div>
        ) : (
          <div className="absolute bottom-10 pointer-events-auto">
            <button
              onClick={endConversation}
              className="text-red-500 text-xs tracking-[0.2em] border border-red-900/50 px-4 py-2 hover:bg-red-900/20 transition-colors bg-black/50 backdrop-blur"
            >
              TERMINATE UPLINK
            </button>
          </div>
        )}
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

    </div>
  );
};

export default App;
