
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

// -- CONFIGURATION --
const app = express();
const PORT = process.env.PORT || 8080;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// -- AI LOGIC (MIGRATED FROM api/brief.ts) --
const BRIEF_SYSTEM_INSTRUCTION = `
# ROLE: Judgment Demonstration System (v1)
# GOAL: Deliver disciplined judgment under uncertainty. "WOW" operator-level execs.

HARD RULES:
1. Never output feature checklists or generic SWOTs.
2. ALWAYS take a stance: Define the most_likely_path, second_most_dangerous_path, and a recommended_move.
3. ALWAYS include a "flip_condition" - one observable event that would change your recommendation.
4. If clarity is impossible, state "UNCLEAR" and list resolving_signals. Do not fake certainty.
5. Separate domains (Narrative vs Product vs Capital). Prevent category errors.

# CALIBRATION (STRATEGIC CONVICTION):
- HIGH: You found strong, corroborating search results (numbers/quotes) that support a definitive thesis.
- MEDIUM: You found data, but there are conflicting signals or significant gaps in the financial picture.
- LOW: Search returned generic marketing fluff or no hard data.
*NOTE: "High Confidence" does not mean "Certainty of Future" (impossible). It means "Certainty of Evidence". If the signals are clear, mark HIGH.*

# INTELLIGENCE BUCKETS (Use these to filter signals):
1. INCENTIVES_POWER (Investor pressure, survival, politics)
2. STRUCTURAL_FRAGILITY (Unit econ, dependencies, chokepoints)
3. NARRATIVE_TRAJECTORY (Language shifts, framing, trust)
4. TEMPORAL_DYNAMICS (Windows, lag, adoption curves)
5. CROSS_DOMAIN_PATTERNS (Historical structures, analogies)

# OUTPUT SCHEMA (JSON Only):
You must output valid JSON matching this structure exactly:
{
  "intent": {
    "type": "SITUATIONAL | DECISION_DRIVEN | RISK_FOCUSED",
    "context_label": "POSITIONING | TIMING | CAPITAL | RISK | NARRATIVE_TRUST"
  },
  "frame": {
    "sentence": "Restate what this really is (e.g., 'This is a capital efficiency squeeze, not a product war').",
    "what_changed": "1-2 sentences on the shift.",
    "why_it_matters": "1-2 sentences on impact."
  },
  "scenarios": {
    "most_likely": "The baseline path (mechanism, not story).",
    "second_most_dangerous": "The risk case that could blindside us."
  },
  "strategy": {
    "recommended_move": "Single decisive action.",
    "alternative_move": "Backup action.",
    "flip_condition": "One observable condition that invalidates the recommendation.",
    "watchlist": ["Signal 1", "Signal 2", "Signal 3"]
  },
  "dossier": {
    "key_signals": [
      { "bucket": "STRUCTURAL_FRAGILITY", "content": "Specific evidence point..." },
      { "bucket": "INCENTIVES_POWER", "content": "Specific evidence point..." }
    ]
  },
  "confidence": {
    "band": "LOW | MEDIUM | HIGH",
    "resolving_signals": ["What evidence would raise confidence?"]
  }
}
`;

app.post('/api/brief', async (req, res) => {
    try {
        const { companyName, companyUrl } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Missing GEMINI_API_KEY");
            return res.status(500).json({ error: "Server Configuration Error" });
        }

        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
          Analyze the following target for an EXECUTIVE BRIEF.
          Target Name: ${companyName}
          Target URL: ${companyUrl || "Search for it"}
          
          If the URL is missing, infer the most likely major company with this name.
          USE GOOGLE SEARCH to find the latest pricing, recent news, and strategic shifts.
          
          CRITICAL INSTRUCTIONS:
          1. Apply the Judgment Demonstration System v1 rules. Be ruthless.
          2. YOU MUST RETURN VALID JSON WITH ALL FIELDS FILLED. NO EXPECTATIONS.
          3. REQUIRED FIELDS:
             - frame.sentence
             - frame.what_changed (CANNOT BE EMPTY)
             - frame.why_it_matters
             - scenarios.most_likely (CANNOT BE EMPTY)
             - scenarios.second_most_dangerous (CANNOT BE EMPTY)
             - strategy.recommended_move
             - strategy.alternative_move
             - strategy.flip_condition
             - strategy.watchlist
             - dossier.key_signals
             - confidence.band
          4. "Operational Directive" must be bold, specific, and actionable.
          5. DO NOT return generic placeholders like "Analyzing..." or "Data acquisition...".
          
          Include specific signals in the dossier bucket based on the SEARCH RESULTS.
        `;

        console.log(`[Brief] Using Model: gemini-3-flash-preview`);
        const response = await ai.models.generateContent({
            // GEMINI 3 FLASH (PREVIEW)
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: BRIEF_SYSTEM_INSTRUCTION,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING },
                                context_label: { type: Type.STRING },
                            },
                        },
                        frame: {
                            type: Type.OBJECT,
                            properties: {
                                sentence: { type: Type.STRING },
                                what_changed: { type: Type.STRING },
                                why_it_matters: { type: Type.STRING },
                            },
                        },
                        scenarios: {
                            type: Type.OBJECT,
                            properties: {
                                most_likely: { type: Type.STRING },
                                second_most_dangerous: { type: Type.STRING },
                            },
                        },
                        strategy: {
                            type: Type.OBJECT,
                            properties: {
                                recommended_move: { type: Type.STRING },
                                alternative_move: { type: Type.STRING },
                                flip_condition: { type: Type.STRING },
                                watchlist: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING }
                                },
                            },
                        },
                        dossier: {
                            type: Type.OBJECT,
                            properties: {
                                key_signals: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            bucket: { type: Type.STRING },
                                            content: { type: Type.STRING }
                                        },
                                    }
                                }
                            },
                        },
                        confidence: {
                            type: Type.OBJECT,
                            properties: {
                                band: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
                                resolving_signals: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING }
                                },
                            },
                        },
                    },
                },
            }
        });

        const text = response.text;
        console.log("[Brief] Raw Response:", text);
        res.setHeader('Content-Type', 'application/json');
        res.send(text);

    } catch (e) {
        console.error("Brief API Error:", e);
        // RETURN ACTUAL ERROR TO CLIENT
        res.status(500).json({ error: e.message || "Server Error" });
    }
});

// -- DEEP DOSSIER LOGIC (MIGRATED FROM api/dossier.ts) --
app.post('/api/dossier', async (req, res) => {
    try {
        const { companyName } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return res.status(500).json({ error: "Configuration Error" });

        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
          GENERATE A DEEP-DIVE STRATEGIC AUDIT FOR: ${companyName}
          
          ROLE: Senior Private Equity Analyst (Red Team).
          GOAL: Find the "Kill Shot" - the existential threat or the hidden edge.
          
          CRITICAL RESEARCH RULES:
          1.  USE GOOGLE SEARCH. Do not hallucinate.
          2.  FIND HARD DATA: Revenue, Burn Rate, churn, lawsuits, executive departures.
          3.  NO GENERIC FLUFF. "Strong brand" is banned. Say "NPS of 72" or "35% unaided awareness".
          4.  CITATIONS ARE MANDATORY. Every claim must have a source.
          
          Structure the report into these exact sections:
          1. EXECUTIVE SUMMARY: The bottom line judgment. (BLUF)
          2. MARKET FRICTION: Why is their growth hard? What are the structural headwinds?
          3. COMPETITIVE LETHALITY: Who is actually killing them and how? (Not just a list of names).
          4. OPERATIONAL REALITY: Financial health, leadership turmoil, or product velocity checks.
          5. THE "ALPHA": One unique insight that the market is missing.
        `;

        const response = await ai.models.generateContent({
            // GEMINI 3 PRO (PREVIEW)
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                // thinkingConfig removed to prevent 500 errors
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        sections: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    content: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                        description: "3-4 detailed paragraphs per section."
                                    },
                                    metrics: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                label: { type: Type.STRING },
                                                value: { type: Type.STRING }
                                            }
                                        }
                                    }
                                },
                                required: ["title", "content", "metrics"]
                            }
                        },
                        sources: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const text = response.text;
        const data = JSON.parse(text || "{}");

        // Extract sources from Grounding Metadata
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const webSources = groundingChunks
            .map(c => c.web?.uri)
            .filter(uri => uri && uri.startsWith('http'));

        // Fallback: Check if the model put sources in the JSON itself
        const jsonSources = data.sources || [];

        const mergedSources = [...new Set([...webSources, ...jsonSources])].slice(0, 8);

        const mergedData = {
            sections: data.sections || [],
            sources: mergedSources
        };

        res.json(mergedData);

    } catch (e) {
        console.error("Dossier API Error:", e);
        // RETURN ACTUAL ERROR TO CLIENT
        res.status(500).json({ error: e.message || "Server Error" });
    }
});

// -- SERVE FRONTEND --
// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React routing, return index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Bind to 0.0.0.0 for Docker/Cloud Run
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

// Global Error Handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
