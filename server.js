
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
          Apply the Judgment Demonstration System v1 rules. Be ruthless.
          Include specific signals in the dossier bucket based on the SEARCH RESULTS.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp', // Fast, initial screen
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
                            required: ["type", "context_label"]
                        },
                        frame: {
                            type: Type.OBJECT,
                            properties: {
                                sentence: { type: Type.STRING },
                                what_changed: { type: Type.STRING },
                                why_it_matters: { type: Type.STRING },
                            },
                            required: ["sentence", "what_changed", "why_it_matters"]
                        },
                        scenarios: {
                            type: Type.OBJECT,
                            properties: {
                                most_likely: { type: Type.STRING },
                                second_most_dangerous: { type: Type.STRING },
                            },
                            required: ["most_likely", "second_most_dangerous"]
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
                            required: ["recommended_move", "alternative_move", "flip_condition", "watchlist"]
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
                                        required: ["bucket", "content"]
                                    }
                                }
                            },
                            required: ["key_signals"]
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
                            required: ["band", "resolving_signals"]
                        },
                    },
                },
            }
        });

        const text = response.text;
        res.setHeader('Content-Type', 'application/json');
        res.send(text);

    } catch (e) {
        console.error("Brief API Error:", e);
        res.status(500).json({ error: e.message });
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
          
          You are a Senior Private Equity Analyst. 
          Conduct a "Red Team" analysis.
          
          REQUIREMENTS:
          1. USE GOOGLE SEARCH to find hard numbers (Revenue, CAGR, Burn Rate, Market Cap, Headcount changes).
          2. Quote specific recent events (last 3 months) as evidence.
          3. Do not be generic. Be specific, numerical, and critical.
          
          Structure the report into these exact sections:
          1. EXECUTIVE SUMMARY: The bottom line judgment.
          2. MARKET FRICTION: Why is their growth hard? What are the structural headwinds?
          3. COMPETITIVE LETHALITY: Who is actually killing them and how? (Not just a list of names).
          4. OPERATIONAL REALITY: Financial health, leadership turmoil, or product velocity checks.
          5. THE "ALPHA": One unique insight that the market is missing.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-thinking-exp-1219',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                thinkingConfig: { thinkingBudget: 1024 },
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

        // Extract sources
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const webSources = groundingChunks
            .map(c => c.web?.uri)
            .filter(uri => !!uri);

        const mergedData = {
            sections: data.sections || [],
            sources: [...new Set([...webSources, ...(data.sources || [])])].slice(0, 8)
        };

        res.json(mergedData);

    } catch (e) {
        console.error("Dossier API Error:", e);
        res.status(500).json({ error: e.message });
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

// Global Error Handlers to prevent startup crashes from being silent
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
