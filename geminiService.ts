import { ExecutiveBrief, DeepDossier } from "./types";

// Helper to ensure the report always has the correct shape (unchanged)
const sanitizeBrief = (data: any, targetName: string): ExecutiveBrief => {
  return {
    target_name: targetName.toUpperCase(),
    intent: {
      type: data?.intent?.type || "SITUATIONAL",
      context_label: data?.intent?.context_label || "RISK",
    },
    frame: {
      sentence: data?.frame?.sentence || "Analyzing strategic context...",
      what_changed: data?.frame?.what_changed || "Data acquisition in progress.",
      why_it_matters: data?.frame?.why_it_matters || "Impact assessment pending.",
    },
    scenarios: {
      most_likely: data?.scenarios?.most_likely || "Calculating baseline trajectory...",
      second_most_dangerous: data?.scenarios?.second_most_dangerous || "Scanning for tail risks...",
    },
    strategy: {
      recommended_move: data?.strategy?.recommended_move || "Stand by for recommendation.",
      alternative_move: data?.strategy?.alternative_move || "Formulating backup...",
      flip_condition: data?.strategy?.flip_condition || "Defining pivot points...",
      watchlist: Array.isArray(data?.strategy?.watchlist) ? data.strategy.watchlist : [],
    },
    dossier: {
      key_signals: Array.isArray(data?.dossier?.key_signals) ? data.dossier.key_signals : [],
    },
    confidence: {
      band: data?.confidence?.band || "MEDIUM",
      resolving_signals: Array.isArray(data?.confidence?.resolving_signals) ? data.confidence.resolving_signals : [],
    }
  };
};

export const generateExecutiveBrief = async (companyName: string, companyUrl?: string): Promise<ExecutiveBrief> => {
  try {
    const response = await fetch('/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, companyUrl })
    });

    if (!response.ok) {
      throw new Error(`Server Error: ${response.statusText}`);
    }

    const rawData = await response.json();
    return sanitizeBrief(rawData, companyName);

  } catch (err) {
    console.error("Gemini Analysis Failed:", err);
    return sanitizeBrief({}, companyName);
  }
};

export const generateDeepDossier = async (companyName: string): Promise<DeepDossier> => {
  try {
    const response = await fetch('/api/dossier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName })
    });

    if (!response.ok) {
      console.error("Deep Dossier Server Error");
      return { is_ready: false, sections: [], sources: [] };
    }

    const data = await response.json();

    return {
      is_ready: true,
      sections: data.sections || [],
      sources: data.sources || []
    };

  } catch (e) {
    console.error("Deep Dossier Failed", e);
    return { is_ready: false, sections: [], sources: [] };
  }
};
