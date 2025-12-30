import { ExecutiveBrief, DeepDossier } from '../types';

export const generateDossierHTML = (brief: ExecutiveBrief, dossier: DeepDossier): string => {
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toISOString();

    // Basic Markdown->HTML parser for the specific AI output structure
    const parseMarkdown = (text: string) => {
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
        return html;
    };

    const renderSection = (title: string, content: string[], metrics: { label: string; value: string }[]) => {
        return `
      <section class="section-break">
        <h2 class="section-title">
          <span style="color: #666; margin-right: 8px;">//</span> ${title}
        </h2>
        
        <div class="grid-layout">
          <div class="content-col">
            ${content.map(p => `
              <p>${parseMarkdown(p)}</p>
            `).join('')}
          </div>
          
          ${metrics.length > 0 ? `
            <div class="metrics-col">
              <h3 class="metrics-header">SIGNAL INTELLIGENCE</h3>
              ${metrics.map(m => `
                <div class="metric-box">
                  <div class="metric-label">${m.label}</div>
                  <div class="metric-value">${m.value}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </section>
    `;
    };

    const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap');

    :root {
      --font-serif: 'Merriweather', serif;
      --font-sans: 'Inter', sans-serif;
      --color-black: #111;
      --color-gray: #666;
      --color-light-gray: #eee;
      --spacing-unit: 20px;
    }

    body {
      max-width: 900px;
      margin: 0 auto;
      padding: 60px;
      font-family: var(--font-serif);
      line-height: 1.8;
      color: var(--color-black);
      background: #fff;
      -webkit-font-smoothing: antialiased;
    }

    /* Print Optimization */
    @media print {
      body {
        max-width: 100%;
        padding: 0;
        margin: 20mm;
      }
      .no-print { display: none !important; }
      a { text-decoration: none; color: #000; }
      .section-break { page-break-inside: avoid; }
    }

    /* Typography */
    h1, h2, h3, h4 { font-family: var(--font-sans); }
    
    h1 {
      font-weight: 900;
      font-size: 48px;
      text-transform: uppercase;
      letter-spacing: -2px;
      line-height: 0.9;
      margin: 0 0 10px 0;
    }

    .subtitle {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 24px;
      color: #444;
      border-left: 4px solid #000;
      padding-left: 15px;
      margin-bottom: 40px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
      margin: 60px 0 30px 0;
    }

    p { margin-bottom: 20px; font-size: 16px; text-align: justify; }
    strong { font-weight: 700; color: #000; }

    /* Layout Components */
    .masthead {
      border-bottom: 4px solid #000;
      padding-bottom: 10px;
      margin-bottom: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      margin-bottom: 60px;
    }

    .meta-item {
      padding: 20px;
      border-right: 2px solid #eee;
    }
    .meta-item:last-child { border-right: none; }

    .meta-label {
      display: block;
      font-family: var(--font-sans);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--color-gray);
      margin-bottom: 5px;
    }

    .meta-value {
      font-family: var(--font-sans);
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
    }

    .grid-layout {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 40px;
    }

    .metrics-col {
      padding-top: 5px;
    }

    .metrics-header {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--color-gray);
      margin-bottom: 20px;
    }

    .metric-box {
      background: #f9f9f9;
      border-left: 4px solid #ccc;
      padding: 15px;
      margin-bottom: 10px;
    }

    .metric-label {
      font-family: var(--font-sans);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 4px;
    }

    .metric-value {
      font-family: var(--font-sans);
      font-size: 18px;
      font-weight: 700;
    }

    /* Footer */
    .footer {
      margin-top: 80px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-family: var(--font-mono);
      font-size: 10px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: flex;
      justify-content: space-between;
    }
    
    .source-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 40px;
      font-family: sans-serif;
      font-size: 11px;
      color: #666;
    }
    
    .source-item a { color: #666; text-decoration: underline; }

    /* Utilities */
    .color-high { color: #166534; }
    .color-medium { color: #854d0e; }
    .color-low { color: #991b1b; }
    
    @media (max-width: 768px) {
      body { padding: 20px; }
      .grid-layout { grid-template-columns: 1fr; }
      .meta-grid { grid-template-columns: 1fr; border-right: none; }
      .meta-item { border-right: none; border-bottom: 1px solid #eee; }
    }
  `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Athena Intel // ${brief.target_name}</title>
    <style>${css}</style>
</head>
<body>

    <div class="masthead">
        <div>
            <div style="font-family: var(--font-sans); font-weight: 900; font-size: 12px; letter-spacing: 3px; text-transform: uppercase;">
                Strategic Intelligence Div.
            </div>
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-top: 5px;">
                Auth: ATHENA-AGI // Ver. 2.1.0
            </div>
        </div>
        <div style="text-align: right;">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666;">Date Generated</div>
            <div style="font-family: var(--font-sans); font-weight: 700; font-size: 14px;">${dateStr}</div>
        </div>
    </div>

    <header>
        <h1>${brief.target_name}</h1>
        <div class="subtitle">Strategic Assessment & Risk Profile</div>
    </header>

    <div class="meta-grid">
        <div class="meta-item">
            <span class="meta-label">Sector Context</span>
            <span class="meta-value">${brief.intent.context_label}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Risk Band</span>
            <span class="meta-value ${brief.confidence.band === 'HIGH' ? 'color-high' : brief.confidence.band === 'MEDIUM' ? 'color-medium' : 'color-low'}">
                ${brief.confidence.band} RISK
            </span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Primary Intent</span>
            <span class="meta-value">${brief.intent.type}</span>
        </div>
    </div>

    <main>
        <!-- Executive Summary comes first -->
        ${dossier.sections.filter(s => s.title.includes("SUMMARY")).map(s => renderSection("Executive Judgment", s.content, s.metrics)).join('')}

        <!-- Other Sections -->
        ${dossier.sections.filter(s => !s.title.includes("SUMMARY")).map(s => renderSection(s.title, s.content, s.metrics)).join('')}
    </main>

    <div class="section-title" style="margin-top: 80px;">Reference Links</div>
    <div class="source-list">
        ${dossier.sources.map((src, i) => `
            <div class="source-item">
                <strong>[${i + 1}]</strong> <a href="${src}" target="_blank">${src}</a>
            </div>
        `).join('')}
    </div>

    <footer class="footer">
        <div>Generated by Athena Operational Intelligence Grid</div>
        <div>${timeStr}</div>
    </footer>

</body>
</html>`;
};
