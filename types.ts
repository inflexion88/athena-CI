
export interface Signal {
  bucket: string;
  content: string;
}

export interface DeepDossier {
  is_ready: boolean;
  sections: {
    title: string;
    content: string[]; // Paragraphs
    metrics: { label: string; value: string }[];
  }[];
  sources: string[];
}

export interface ExecutiveBrief {
  target_name: string;
  intent: {
    type: string;
    context_label: string;
  };
  frame: {
    sentence: string;
    what_changed: string;
    why_it_matters: string;
  };
  scenarios: {
    most_likely: string;
    second_most_dangerous: string;
  };
  strategy: {
    recommended_move: string;
    alternative_move: string;
    flip_condition: string;
    watchlist: string[];
  };
  dossier: {
    key_signals: Signal[];
  };
  confidence: {
    band: "LOW" | "MEDIUM" | "HIGH";
    resolving_signals: string[];
  };
}

export enum UIState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ANALYZING = 'ANALYZING'
}
