import React, { useEffect, useMemo, useState } from "react";

// ---- Label typing helpers (keep) ----
type LabelValue = string | ((n: number) => string);

// Make all label keys explicit strings; only `moreInvestors` is a function.
type Labels = {
  title: string;
  subtitle: string;
  upload: string;
  or: string;
  browse: string;
  company: string;
  email: string;
  training: string;
  analyse: string;
  general: string;
  keyfacts: string;
  details: string;
  segments: string;
  missingHdr: string;
  export: string;
  download: string;
  copied: string;
  copyBlocked: string;
  needsFile: string;
  fallbackMock: string;
  historyHdr: string;
  summary: string;
  lang: string;
  sectionsMissing: string;
  investors: string;
  moreInvestors: (n: number) => string;
  country: string;
  focus: string;
  stage: string;
  check: string;
  ask: string;
  linkedin: string;
  whyMatch: string;
  match: string;
  fromDeck: string;
  evaluation: string;
  benchmark: string;
};

// 👇 keep only this alias – do NOT have any `type Lanes = …` in the file
type LaneBuckets = { good: string[]; missing: string[]; importance: string[]; value: string[] };
type Segment = { name: string; score: number; lanes: LaneBuckets };
type Parsed = { segments: Segment[]; missing: Array<{ section: string; why: string }> };
type Review = { general: string; detailed: string; score: number; stage: string };

// Extra types for state/history and CSS
type Lang = "ES" | "EN";

type HistoryItem = {
  id: string;
  ts: number;
  company?: string;
  email?: string;
  lang: Lang;
  fileName?: string;
  score: number;
  stage: string;
  trainingAllowed: boolean;
  summary3: string[];
  ctx: { sector: string; country: string; stage: string };
};

type CSSWithAccent = React.CSSProperties & { ["--accent"]?: string };

// Allow a typed flag on window for the tiny unit tests
declare global {
  interface Window {
    __LATAM_TESTS_RAN__?: boolean;
  }
}

// ====================== Small helpers ======================

/** Clamp a number between a..b */
const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Safe stringifier */
const S = (v: unknown): string => (v == null ? "" : String(v));

/** Robust language normalizer: returns only "ES" or "EN"; defaults to EN for unknowns */
export function stableLang(v: unknown): Lang {
  return String(v ?? "EN").toUpperCase().startsWith("ES") ? "ES" : "EN";
}

const LBL: { EN: Labels; ES: Labels } = {
  EN: {
    title: "LATAM Pitch Reviewer",
    subtitle: "Upload your deck and get a structured investor-style review.",
    upload: "Drag & drop your deck — PDF, PPTX",
    or: "or",
    browse: "Browse files",
    company: "Company name",
    email: "Contact e-mail",
    training: "Allow using this deck for training & benchmarks",
    analyse: "Analyse deck",
    general: "General assessment",
    keyfacts: "Key facts evaluation",
    details: "Detailed feedback",
    segments: "Segmented review",
    missingHdr: "What’s missing",
    export: "Export Markdown",
    download: ".md ready",
    copied: "Copied!",
    copyBlocked: "Copy blocked by permissions.",
    needsFile: "Please add a deck first.",
    fallbackMock: "Backend failed — showing demo.",
    historyHdr: "History",
    summary: "Summary",
    lang: "Language",
    sectionsMissing: "Sections / key info missing",
    investors: "Potential investors (top 3)",
    moreInvestors: (n: number) => `+${n} more in Pitch Expert`,
    country: "Geo",
    focus: "Focus",
    stage: "Stage",
    check: "Ticket",
    ask: "Ask",
    linkedin: "LinkedIn",
    whyMatch: "Why a good match",
    match: "Match",
    fromDeck: "From the deck",
    evaluation: "Evaluation",
    benchmark: "Comparable benchmark",
  },
  ES: {
    title: "Revisor de Pitches LATAM",
    subtitle: "Sube tu deck y recibe una revisión estructurada al estilo inversor.",
    upload: "Arrastra y suelta tu deck — PDF, PPTX",
    or: "o",
    browse: "Buscar archivo",
    company: "Nombre de la empresa",
    email: "Correo de contacto",
    training: "Permitir usar este deck para entrenamiento y benchmarks",
    analyse: "Analizar deck",
    general: "Evaluación general",
    keyfacts: "Evaluación de aspectos clave",
    details: "Feedback detallado",
    segments: "Revisión por secciones",
    missingHdr: "Qué falta",
    export: "Exportar Markdown",
    download: "Descargar .md",
    copied: "¡Copiado!",
    copyBlocked: "Permiso denegado: no se pudo copiar.",
    needsFile: "Primero añade un deck.",
    fallbackMock: "El backend falló — mostrando demo.",
    historyHdr: "Historial",
    summary: "Resumen",
    lang: "Idioma",
    sectionsMissing: "Secciones / información clave faltante",
    investors: "Inversionistas potenciales (top 3)",
    moreInvestors: (n: number) => `+${n} más en Pitch Expert`,
    country: "Geo",
    focus: "Enfoque",
    stage: "Etapa",
    check: "Ticket",
    ask: "Ronda (Ask)",
    linkedin: "LinkedIn",
    whyMatch: "Por qué es buen fit",
    match: "Match",
    fromDeck: "Del deck",
    evaluation: "Evaluación",
    benchmark: "Benchmark comparable",
  },
};

// Lightweight context extraction from filename (to personalize output without backend)
export function contextFromName(name: string = ""): { sector: string; country: string; stage: string } {
  const s = name.toLowerCase();
  const sector = /fintech|bank|wallet|payments|pay|loan|credit/.test(s)
    ? "Fintech"
    : /saas|b2b|erp|crm|api|dev/.test(s)
    ? "B2B SaaS"
    : /market|ecom|commerce|delivery|logistic/.test(s)
    ? "Marketplace"
    : /health|med|care|clinic/.test(s)
    ? "HealthTech"
    : /edtech|edu|learn/.test(s)
    ? "EdTech"
    : "General";
  const country = /mex|mx/.test(s)
    ? "México"
    : /br|brazil|brasil/.test(s)
    ? "Brasil"
    : /co|colom/.test(s)
    ? "Colombia"
    : /ar|argen/.test(s)
    ? "Argentina"
    : /cl|chile/.test(s)
    ? "Chile"
    : "LATAM";
  const stage = /seed/.test(s) ? "Seed" : /pre[-\s]?seed|preseed/.test(s) ? "Pre-seed" : "Pre-seed";
  return { sector, country, stage };
}

// Demo review (used client-side)
export function genMock(
  lang: string,
  ctx?: { sector?: string; country?: string }
): { score: number; stage: string; general: string; detailed: string } {
  const ES = stableLang(lang) === "ES";
  const seg = ctx?.sector || "General";
  const geo = ctx?.country || "LATAM";
  const head = ES
    ? `> **Puntaje:** 74/100  *(Etapa: Pre-seed)*  \n> ${seg} en ${geo}. Problema/Solución claros con primeros indicadores de tracción. Fortalece el dimensionamiento de mercado y la claridad del pricing para una próxima ronda.`
    : `> **Score:** 74/100  *(Stage: Pre-seed)*  \n> ${seg} in ${geo}. Clear problem/solution with early traction. Strengthen market sizing and pricing clarity before next raise.`;
  const tableES = `| Sección | Score | Mejora |
|---------|-----:|--------|
| Problem | 8 | **Por qué:** Dolor concreto con evidencia cualitativa.<br>**Mejora:** Cuantificar frecuencia/costo y definir segmento primario.<br>**Por qué importa:** Dolor validado → adopción y priorización de roadmap.<br>**Ejemplo:** encuesta con N y %, casos de uso top-2.|
| Solution | 7 | **Por qué:** Flujos núcleo claros; UX razonable.<br>**Mejora:** Riesgos del roadmap y mitigación; SLAs técnicos.<br>**Por qué importa:** Reduce riesgo de ejecución y churn.<br>**Ejemplo:** hitos trimestrales y criterios de éxito.|
| Market | 5 | **Por qué:** TAM mencionado sin fuente; foco regional LATAM.<br>**Mejora:** Citas y SOM bottom-up por país/vertical.<br>**Por qué importa:** Enfoque y upside creíbles ante fondos.<br>**Ejemplo:** cohortes por vertical + fórmula SOM.|
| Business Model | 6 | **Por qué:** Pricing preliminar por usuario/mes.<br>**Mejora:** Unit economics por canal y supuestos de CAC.<br>**Por qué importa:** Ruta a márgenes sanos y eficiencia.<br>**Ejemplo:** tabla LTV/CAC por país.|
| Traction | 7 | **Por qué:** 1.5k MAUs + 3 pilotos B2B.<br>**Mejora:** Cohortes y retención M2/M3; payback CAC.<br>**Por qué importa:** PMF emergente.<br>**Ejemplo:** gráfico de retención y funnel.|
| Team | 8 | **Por qué:** Experiencia relevante en el dominio.<br>**Mejora:** Rol comercial senior + advisor regulatorio.<br>**Por qué importa:** Velocidad de ejecución y GTM.<br>**Ejemplo:** plan de contratación y OKRs.|
| Ask | 6 | **Por qué:** Ronda definida (US$800k).<br>**Mejora:** Mapear a hitos y reducción de riesgos por trimestre.<br>**Por qué importa:** Asignación de capital eficiente.<br>**Ejemplo:** roadmap vs burn y runway.|
| Design | 6 | **Por qué:** Limpio pero inconsistente.<br>**Mejora:** Guía de estilo única y jerarquía tipográfica.<br>**Por qué importa:** Legibilidad y confianza comercial.<br>**Ejemplo:** sistema tipográfico y componentes.|

**Qué falta / débil para un deck Pre-seed:**

| Sección | Por qué importa |
|---------|------------------|
| Market | Dimensionamiento y SOM creíbles guían foco y upside. |
| Business Model | Unit economics por canal señalan escalabilidad. |
`;
  const tableEN = `| Bucket | Score | Improvement |
|--------|-----:|------------|
| Problem | 8 | **Why:** Pain is concrete with evidence.<br>**Improvement:** Quantify frequency/cost & define primary segment.<br>**Why investors care:** Validated pain → adoption & roadmap focus.<br>**Example:** survey N/% + top-2 use-cases.|
| Solution | 7 | **Why:** Core flows are clear; reasonable UX.<br>**Improvement:** Roadmap risks & mitigation; tech SLAs.<br>**Why investors care:** Lowers execution/churn risk.<br>**Example:** quarterly milestones & success criteria.|
| Market | 5 | **Why:** TAM stated, sources unclear; LATAM focus.<br>**Improvement:** Cite & segment SOM bottom-up by country/vertical.<br>**Why investors care:** Credible focus & upside for funds.<br>**Example:** vertical cohorts + SOM formula.|
| Business Model | 6 | **Why:** Early per-seat pricing.<br>**Improvement:** Channel unit economics & CAC assumptions.<br>**Why investors care:** Path to healthy margins & efficiency.<br>**Example:** LTV/CAC by country.|
| Traction | 7 | **Why:** 1.5k MAUs + 3 B2B pilots.<br>**Improvement:** Cohorts, M2/M3 retention; CAC payback.<br>**Why investors care:** Emerging PMF.<br>**Example:** retention and funnel chart.|
| Team | 8 | **Why:** Relevant domain experience.<br>**Improvement:** Senior commercial role + regulatory advisor.<br>**Why investors care:** Execution speed & GTM.<br>**Example:** hiring plan & OKRs.|
| Ask | 6 | **Why:** Round set (US$800k).<br>**Improvement:** Map to milestones/risk burn-down per quarter.<br>**Why investors care:** Efficient capital allocation.<br>**Example:** roadmap vs burn & runway.|
| Design | 6 | **Why:** Clean but inconsistent.<br>**Improvement:** Unified style guide & typographic hierarchy.<br>**Why investors care:** Readability & trust.<br>**Example:** type system & components.|

**What’s weak / missing for a Pre-seed deck:**

| Section | Why it matters |
|---------|-----------------|
| Market | Credible sizing & SOM drive focus and upside. |
| Business Model | Channel unit economics signal scalability. |
`;
  return {
    score: 74,
    stage: "Pre-seed",
    general: head,
    detailed: stableLang(lang) === "ES" ? tableES : tableEN,
  };
}

export function toMarkdown(r: { general?: string; detailed?: string } | null): string {
  if (!r) return "";
  return `# Pitch-Deck Review

${S(r.general).replace(/> /g, "")}

${S(r.detailed)}`;
}

// Parse the markdown table above into segments & missing rows
export function parseDetailed(md: string): Parsed {
  const out: Parsed = { segments: [], missing: [] };
  if (!md) return out;

  const lines = String(md).split(/\r?\n/);

  // ---- main table (segments)
  for (const ln of lines) {
    const isRow = /^\|/.test(ln) && !/^-{3,}/.test(ln);
    if (isRow) {
      const cells = ln.split("|").map((s) => s.trim());
      if (cells.length >= 4 && !/^(-{3,}|Bucket|Sección|--------)/i.test(cells[1])) {
        const name = cells[1];
        const raw = cells[cells.length - 2] || "";
        const score = Math.max(0, Math.min(10, parseInt(cells[2], 10) || 0));

        const bullets = String(raw)
          .split(/<br\s*\/?>/i)
          .map((x) => x.trim())
          .filter(Boolean);

        const lane: LaneBuckets = { good: [], missing: [], importance: [], value: [] };
        for (const b of bullets) {
          const t = b.replace(/\*\*/g, "").trim();
          if (/^(Why:|Por qué:)/i.test(t)) {
            lane.good.push(t.replace(/^(Why:|Por qué:)\s*/i, "").trim());
          } else if (/^(Improvement:|Mejora:)/i.test(t)) {
            lane.missing.push(t.replace(/^(Improvement:|Mejora:)\s*/i, "").trim());
          } else if (/^(Why investors care:|Por qué importa:)/i.test(t)) {
            lane.importance.push(t.replace(/^(Why investors care:|Por qué importa:)\s*/i, "").trim());
          } else if (/^(Example:|Ejemplo:)/i.test(t)) {
            lane.value.push(t.replace(/^(Example:|Ejemplo:)\s*/i, "").trim());
          } else {
            lane.good.push(t);
          }
        }

        out.segments.push({ name, score, lanes: lane });
      }
    } else if (ln.trim() === "") {
      break;
    }
  }

  // ---- "What's missing" table
  const missIdx = lines.findIndex((l) => /\*\*\s*(What's|What’s|Qué)\b/i.test(l));
  if (missIdx !== -1) {
    for (let i = missIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      const isRow = /^\|/.test(l) && !/^-{3,}/.test(l);
      if (isRow) {
        const c = l.split("|").map((s) => s.trim());
        if (c.length >= 3 && !/^(-{3,}|Section|Sección|---------)/i.test(c[1])) {
          out.missing.push({ section: c[1], why: c[2] });
        }
      } else if (l.trim() === "") {
        break;
      }
    }
  }

  return out;
}

export function enrichSegments(
  segments: Array<{
    name: string;
    score: number;
    lanes: { good?: string[]; missing?: string[]; importance?: string[]; value?: string[] };
  }>,
  lang: string = "ES"
) {
  const L = stableLang(lang);

  const add = (arr: string[], ...items: Array<string | undefined | null>) => {
    items.forEach((it) => {
      if (it && arr.length < 3) arr.push(it);
    });
  };

  return segments.map((s) => {
    const lanes: LaneBuckets = {
      good: [...(s.lanes?.good ?? [])],
      missing: [...(s.lanes?.missing ?? [])],
      importance: [...(s.lanes?.importance ?? [])],
      value: [...(s.lanes?.value ?? [])],
    };

    const n = s.name.toLowerCase();

    if (n.includes("market")) {
      add(lanes.missing, L === "ES" ? "SOM por país (fórmula y supuestos)" : "SOM by country (formula & assumptions)");
      add(lanes.importance, L === "ES" ? "Guía el go-to-market y sizing de ronda" : "Guides GTM and round sizing");
      add(lanes.value, L === "ES" ? "Tabla bottom-up: (#clientes x ARPU x penetración)" : "Bottom-up table: (#customers × ARPU × penetration)");
    }

    if (n.includes("business")) {
      add(lanes.missing, L === "ES" ? "CAC por canal y payback" : "Channel CAC & payback");
      add(lanes.value, L === "ES" ? "Modelo LTV/CAC con sensibilidad" : "LTV/CAC model with sensitivity");
    }

    if (n.includes("traction")) {
      add(lanes.missing, L === "ES" ? "Cohortes y retención M2/M3" : "Cohorts & M2/M3 retention");
      add(lanes.importance, L === "ES" ? "Evidencia de PMF y eficiencia" : "Evidence of PMF & efficiency");
      add(lanes.value, L === "ES" ? "Gráfico de retención y embudo" : "Retention & funnel chart");
    }

    if (n.includes("team")) {
      add(lanes.missing, L === "ES" ? "Rol comercial senior (quota-carrier)" : "Senior commercial role (quota carrier)");
      add(lanes.value, L === "ES" ? "Plan de contratación 2-3 roles clave" : "Hiring plan for 2–3 key roles");
    }

    if (n.includes("problem")) {
      add(lanes.missing, L === "ES" ? "Cuantificar frecuencia/costo del dolor" : "Quantify pain frequency/cost");
      add(lanes.value, L === "ES" ? "Encuesta N/% y casos de uso top" : "Survey N/% and top use-cases");
    }

    return { ...s, lanes };
  });
}

export function deriveSummaryBullets(
  segments: Array<{ name: string; score: number; lanes?: { missing?: string[]; good?: string[]; importance?: string[]; value?: string[] } }>,
  _lang?: string
): string[] {
  if (!Array.isArray(segments) || segments.length === 0) return [];

  const sorted = segments.slice().sort((a, b) => (a.score || 0) - (b.score || 0));
  const out: string[] = [];

  for (const s of sorted) {
    const ln: LaneBuckets = {
      good: Array.isArray(s.lanes?.good) ? s.lanes!.good : [],
      missing: Array.isArray(s.lanes?.missing) ? s.lanes!.missing : [],
      importance: Array.isArray(s.lanes?.importance) ? s.lanes!.importance : [],
      value: Array.isArray(s.lanes?.value) ? s.lanes!.value : [],
    };

    const pick = (arr: (string | null | undefined)[]): string | undefined =>
      arr.find((x): x is string => !!x && x !== "—");

    const txt = pick(ln.missing) ?? pick(ln.importance) ?? pick(ln.value) ?? pick(ln.good);
    if (txt) out.push(`${s.name}: ${txt}`);
    if (out.length >= 3) break;
  }

  return out;
}

export function deriveKeyFacts(
  segments: Array<{ name: string; score: number; lanes: { good?: string[]; value?: string[] } }>,
  lang: string = "ES"
) {
  const L = stableLang(lang);

  const get = (n: string) =>
    segments.find((s) => new RegExp(n, "i").test(s.name)) || { name: n, score: 0, lanes: { good: [], value: [] } };

  const pickFrom = (s: { lanes: { good?: string[]; value?: string[] } }, fallback: string): string[] => {
    const arr: string[] = [];
    if (s.lanes.good?.[0]) arr.push(s.lanes.good[0]);
    if (s.lanes.value?.[0]) arr.push(s.lanes.value[0]);
    return arr.length ? arr.slice(0, 2) : [fallback];
  };

  const market = get("Market");
  const traction = get("Traction");
  const team = get("Team");
  const problem = get("Problem");
  const ask = get("Ask");

  const valuationEval =
    market.score + traction.score + team.score >= 20
      ? L === "ES"
        ? "En rango para Pre-seed dada tracción+equipo."
        : "In range for Pre-seed given traction+team."
      : L === "ES"
      ? "Alta vs benchmarks por madurez."
      : "High vs benchmarks for maturity.";

  const valuationBench =
    L === "ES"
      ? "Pre-seed LATAM: US$0.5–3.5M post; cheques US$100–750k."
      : "LATAM Pre-seed: US$0.5–3.5M post; checks US$100–750k.";

  const interest =
    traction.score >= 7 && problem.score >= 7
      ? L === "ES"
        ? "Atractivo para fondos con foco early: señales de adopción y dolor claro."
        : "Attractive for early funds: adoption signals, clear pain."
      : L === "ES"
      ? "Aún temprano: priorizar tracción y tamaño del problema."
      : "Early: prioritize traction and problem size.";

  return {
    valuation: {
      fromDeck: pickFrom(market, L === "ES" ? "Tamaño de mercado mencionado" : "Sizing mentioned"),
      evaluation: valuationEval,
      benchmark: valuationBench,
      ask: pickFrom(ask, L === "ES" ? "No especificado" : "Not specified")[0],
    },
    traction: {
      fromDeck: pickFrom(traction, L === "ES" ? "Señales tempranas" : "Early signals"),
      evaluation:
        traction.score >= 7
          ? L === "ES"
            ? "Positiva; medir retención y payback CAC."
            : "Positive; measure retention and CAC payback."
          : L === "ES"
          ? "Insuficiente; enfocar en cohortes."
          : "Insufficient; focus on cohorts.",
      benchmark: L === "ES" ? "Seed LATAM: retención M3>30% B2C / M3>70% logo B2B (referencial)." : "LATAM Seed: M3 retention >30% B2C / >70% logo B2B (indicative).",
    },
    team: {
      fromDeck: pickFrom(team, L === "ES" ? "Equipo fundacional" : "Founding team"),
      evaluation: team.score >= 7 ? (L === "ES" ? "Sólido para la etapa." : "Strong for stage.") : (L === "ES" ? "Incompleto: cubrir gaps clave." : "Incomplete: cover key gaps."),
      benchmark: L === "ES" ? "Pre-seed: 2–3 founders complementarios; 1 senior GTM deseable." : "Pre-seed: 2–3 complementary founders; senior GTM desirable.",
    },
    market: {
      fromDeck: pickFrom(market, L === "ES" ? "TAM indicado" : "TAM indicated"),
      evaluation: market.score >= 6 ? (L === "ES" ? "Sizing creíble." : "Sizing credible.") : (L === "ES" ? "Sizing débil; construir SOM bottom-up." : "Weak sizing; build bottom-up SOM."),
      benchmark: L === "ES" ? "Esperado: fuentes citadas y SOM por país/vertical." : "Expected: cited sources and SOM by country/vertical.",
    },
    problem: {
      fromDeck: pickFrom(problem, L === "ES" ? "Dolor evidenciado" : "Pain evidenced"),
      evaluation: problem.score >= 7 ? (L === "ES" ? "Dolor validado." : "Validated pain.") : (L === "ES" ? "Cuantificar frecuencia/costo." : "Quantify frequency/cost."),
      benchmark: L === "ES" ? "Bench: encuestas con N>=100 / entrevistas grabadas." : "Bench: surveys N>=100 / recorded interviews.",
    },
    verdict: interest,
  };
}

export function deriveStructuralGaps(segments: Array<{ name: string }>, lang: string = "ES") {
  if (!Array.isArray(segments) || segments.length === 0) return [];
  const L = stableLang(lang);
  const expected = [
    { key: /Competition|Competencia/i, label: L === "ES" ? "Competencia" : "Competition", why: L === "ES" ? "Mapa de competidores da contexto y defensas." : "Competitive map gives context & moats." },
    { key: /Go[- ]?to[- ]?Market|GTM/i, label: L === "ES" ? "Go-to-Market (GTM)" : "Go-to-Market (GTM)", why: L === "ES" ? "Estrategia de adquisición impacta CAC y crecimiento." : "Acquisition strategy impacts CAC & growth." },
    { key: /Financials|Proyecciones/i, label: L === "ES" ? "Proyecciones financieras" : "Financials", why: L === "ES" ? "Modelo financiero refleja supuestos y runway." : "Financial model reflects assumptions & runway." },
    { key: /Product|Tecnolog/i, label: L === "ES" ? "Producto / Tecnología" : "Product / Technology", why: L === "ES" ? "Arquitectura/roadmap reducen riesgo técnico." : "Architecture/roadmap reduce technical risk." },
    { key: /Regulatory|Regulatorio/i, label: L === "ES" ? "Regulatorio/Compliance" : "Regulatory/Compliance", why: L === "ES" ? "Cumplimiento clave en sectores regulados." : "Compliance key in regulated sectors." },
  ];
  const names = segments.map((s) => s.name);
  const gaps: Array<{ section: string; why: string }> = [];
  for (const e of expected) if (!names.some((n) => e.key.test(n))) gaps.push({ section: e.label, why: e.why });
  return gaps;
}

// --- Investor types & data ---
type Investor = {
  name: string;
  geo: string;
  focus: string;
  stages: string[];
  min: number;
  max: number;
};

type RankedInvestor = Investor & {
  linkedin: string;
  matchScore: number; // 0..3
  why: string;
};

const INVESTORS: Investor[] = [
  { name: "Fondo Andino",     geo: "Andes/LATAM",  focus: "B2B SaaS, Fintech",      stages: ["Pre-seed", "Seed"], min: 100_000, max: 600_000 },
  { name: "Río Ventures",      geo: "Brasil/LATAM", focus: "Marketplaces, SMB SaaS", stages: ["Pre-seed", "Seed"], min: 150_000, max: 800_000 },
  { name: "Pacífico Capital",   geo: "México/LATAM", focus: "Fintech, Infra",         stages: ["Pre-seed", "Seed"], min: 200_000, max: 1_000_000 },
  { name: "Pampas Partners",    geo: "Cono Sur",     focus: "AgroTech, B2B",          stages: ["Pre-seed", "Seed"], min: 100_000, max: 500_000 },
  { name: "Caribe Labs",        geo: "Caribe",       focus: "B2C apps, Payments",     stages: ["Pre-seed", "Seed"], min: 50_000,  max: 300_000 },
  { name: "Altiplano Ventures", geo: "Andes",        focus: "Data/AI, SaaS",          stages: ["Pre-seed", "Seed"], min: 100_000, max: 700_000 },
];

function slugifyNameToLinkedIn(name: string): string {
  const x = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const slug = x.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `https://www.linkedin.com/company/${slug}`;
}

export function suggestInvestors(
  stage: string = "Pre-seed",
  tractionScore: number = 6,
  sector: string = "General",
  country: string = "LATAM"
): RankedInvestor[] {
  const scoreFor = (v: Investor) => {
    let s = 0;
    if (String(v.geo).includes(country)) s += 1;
    if (String(v.focus).toLowerCase().includes(String(sector).toLowerCase())) s += 1;
    if ((v.stages || []).includes(stage)) s += 1;
    return s; // 0-3
  };

  const whyFor = (v: Investor) => {
    const bits: string[] = [];
    if (String(v.geo).includes(country)) bits.push("Geo aligned");
    if (String(v.focus).toLowerCase().includes(String(sector).toLowerCase())) bits.push("Sector thesis");
    if ((v.stages || []).includes(stage)) bits.push("Stage fit");
    return bits.join(" • ") || "Generalist";
  };

  const picks: RankedInvestor[] = INVESTORS
    .filter((v) => v.stages.includes(stage))
    .map((v) => ({
      ...v,
      linkedin: slugifyNameToLinkedIn(v.name),
      matchScore: scoreFor(v),
      why: whyFor(v),
    }));

  // simple multi-pass sort
  picks.sort((a, b) => (String(a.geo).includes(country) ? -1 : 1));
  picks.sort((a, b) => (String(a.focus).toLowerCase().includes(String(sector).toLowerCase()) ? -1 : 1));
  picks.sort((a, b) => (tractionScore > 7 ? b.max - a.max : a.min - b.min));
  picks.sort((a, b) => b.matchScore - a.matchScore); // final tie-breaker

  return picks;
}

export async function safeCopy(text: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(S(text));
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = S(text);
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}

// ======================= UI =======================
export default function App() {
  const [uiLang, setUiLang] = useState<Lang>("ES");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [company, setCompany] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [allowTraining, setAllowTraining] = useState<boolean>(true);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const [review, setReview] = useState<Review | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [missing, setMissing] = useState<Array<{ section: string; why: string }>>([]);

  const [toast, setToast] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [ctx, setCtx] = useState<{ sector: string; country: string; stage: string }>({
    sector: "General",
    country: "LATAM",
    stage: "Pre-seed",
  });

  const STR = useMemo(() => LBL[stableLang(uiLang)], [uiLang]);
  const accent = "#5CF2C2";

  const hero = useMemo(
    () =>
      stableLang(uiLang) === "ES"
        ? {
            title: "Entrenado en miles de decks + 30 años de experiencia VC — tu revisor para quedar listo para inversión.",
            sub: "Sube tu deck y recibe una revisión con estándar inversor, enfocada en LATAM.",
            cta: "Empezar",
          }
        : {
            title: "Trained on thousands of decks + 30 years of VC craft — the Pitch Reviewer to get you investor-ready.",
            sub: "Upload your deck and receive an investor-grade review tailored for LATAM.",
            cta: "Get started now",
          },
    [uiLang]
  );

  const scorePct = clamp(Number(review?.score ?? 0), 0, 100);
  const ringStyle = { background: `conic-gradient(${accent} ${3.6 * scorePct}deg, #1f2937 0deg)` };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("latam_pitch_hist") || "[]";
      const parsed = JSON.parse(raw) as HistoryItem[];
      if (Array.isArray(parsed)) setHistory(parsed);
    } catch {}
  }, []);

  useEffect(() => {
    if (file) setCtx(contextFromName(file.name || ""));
  }, [file]);

  function persistHistory(next: HistoryItem[]) {
    setHistory(next);
    try {
      localStorage.setItem("latam_pitch_hist", JSON.stringify(next));
    } catch {}
  }

  async function analyse() {
    if (!file) {
      // Coerce to string because labels are strings, but keep defensive
      setToast(S(STR.needsFile));
      setTimeout(() => setToast(null), 1000);
      return;
    }
    setIsBusy(true);
    const lang = stableLang(uiLang);
    try {
      // Mock call; replace with your real backend later
      await new Promise((r) => setTimeout(r, 300));
      const data = genMock(lang, ctx);
      const parsed = parseDetailed(data.detailed);
      const enriched = enrichSegments(parsed.segments, lang);
      setSegments(enriched);
      setMissing(parsed.missing);
      setReview({
        general: data.general,
        detailed: data.detailed,
        score: data.score ?? 74,
        stage: data.stage ?? ctx.stage,
      });

      const sum3 = deriveSummaryBullets(enriched, lang);
      const item: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        ts: Date.now(),
        company: company || undefined,
        email: email || undefined,
        lang,
        fileName: file?.name,
        score: data.score || 74,
        stage: data.stage || ctx.stage,
        trainingAllowed: !!allowTraining,
        summary3: sum3,
        ctx,
      };
      persistHistory([item, ...history].slice(0, 200));
    } catch {
      setToast(S(STR.fallbackMock));
    } finally {
      setIsBusy(false);
    }
  }

  function exportMd() {
    if (!review) return;
    const md = toMarkdown(review);
    const blob = new Blob([md], { type: "text/markdown" });
    setExportUrl(URL.createObjectURL(blob));
  }

  async function copy(text: string) {
    if (!text) return;
    const ok = await safeCopy(S(text));
    setToast(ok ? S(STR.copied) : S(STR.copyBlocked));
    setTimeout(() => setToast(null), 1200);
  }

  const facts = deriveKeyFacts(segments, uiLang);
  const structGaps = deriveStructuralGaps(segments, uiLang);
  const investorList = suggestInvestors(
    review?.stage || ctx.stage,
    segments.find((s) => /Traction/i.test(s.name))?.score || 6,
    ctx.sector,
    ctx.country
  );

  // TS-safe CSS custom property for --accent
  const uploaderStyle: CSSWithAccent = { ["--accent"]: accent };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-neutral-900 border border-neutral-800/80">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
                <defs>
                  <linearGradient id="g" x1="0" x2="1">
                    <stop offset="0%" stopColor="#5CF2C2" />
                    <stop offset="100%" stopColor="#9FFFE4" />
                  </linearGradient>
                </defs>
                <path d="M3 21c6-1 11-6 12-12 0 0 0-3 3-3 0 0 1 3-2 6s-6 3-6 3" fill="none" stroke="url(#g)" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M14.5 5.5l4 4" fill="none" stroke="url(#g)" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="16.5" cy="7.5" r="1.2" fill="#5CF2C2" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-clip-text text-transparent [background-image:linear-gradient(90deg,#fff,rgba(92,242,194,0.9))]">
                  {STR.title}
                </h1>
                <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300">ALPHA</span>
              </div>
              <p className="text-neutral-400 text-sm md:text-base">{STR.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-400">{STR.lang}</label>
            <select
              className="bg-neutral-900 border border-neutral-800/80 rounded-xl px-3 py-2"
              value={uiLang}
              onChange={(e) => setUiLang(e.target.value as Lang)}
            >
              <option value="ES">ES</option>
              <option value="EN">EN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-5xl px-4 pt-8 pb-12 text-center">
        <h2 className="text-5xl md:text-6xl font-semibold leading-tight tracking-[.01em] mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-300">{hero.title}</span>
        </h2>
        <p className="text-neutral-400 max-w-2xl mx-auto">{hero.sub}</p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <a
            href="#uploader"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 font-semibold shadow-lg ring-1 ring-neutral-700 hover:ring-neutral-500"
            style={{ background: accent, color: "#07110E" }}
          >
            {hero.cta}
            <span aria-hidden>↗</span>
          </a>
        </div>
        <div className="mt-5 text-neutral-400 text-xs">★ ★ ★ ★ ★ 4.9 — founders love the clarity</div>
        <div className="mx-auto mt-8 h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-emerald-300/30 to-transparent"></div>
      </div>

      {/* separator to keep vertical rhythm */}
      <div className="px-4">
        <div className="mx-auto max-w-6xl">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-10">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <div
              onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer?.files?.[0];
                if (f) setFile(f);
              }}
              className={`rounded-2xl border ${dragOver ? "border-[--accent] ring-2 ring-[--accent]" : "border-neutral-800/80"} bg-neutral-900/60 p-5 shadow text-center`}
              id="uploader"
              style={uploaderStyle}
            >
              <label className="text-sm text-neutral-300 block mb-3">{STR.upload}</label>
              <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-950/60 p-8">
                <div className="mb-3 flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5CF2C2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 16.5a4.5 4.5 0 0 0-3.5-7.5 5 5 0 0 0-9.8 1.5"></path>
                    <path d="M12 12v7"></path>
                    <path d="M8.5 15.5 12 12l3.5 3.5"></path>
                  </svg>
                </div>
                <div className="text-neutral-300">
                  {file ? <span className="text-neutral-100">{file.name}</span> : stableLang(uiLang) === "ES" ? "Suelta el archivo aquí" : "Drop file here"}
                </div>
                <div className="text-neutral-600 text-xs mt-3">{STR.or}</div>
                <label className="inline-block mt-3 rounded-xl border border-neutral-700 px-3 py-2 cursor-pointer hover:bg-neutral-800 text-sm">
                  {STR.browse}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.pptx,.ppt"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="mt-4 w-full space-y-3 text-left">
                <div>
                  <label className="text-sm text-neutral-300">{STR.company}</label>
                  <input
                    value={company}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompany(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-neutral-900 border border-neutral-800/80 px-3 py-2"
                    placeholder={stableLang(uiLang) === "ES" ? "opcional" : "optional"}
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-300">{STR.email}</label>
                  <input
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-neutral-900 border border-neutral-800/80 px-3 py-2"
                    placeholder={stableLang(uiLang) === "ES" ? "opcional" : "optional"}
                  />
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm text-neutral-300">
                  <input type="checkbox" checked={allowTraining} onChange={(e) => setAllowTraining(e.target.checked)} className="accent-[#5CF2C2]" />
                  {STR.training}
                </label>
                <button
                  onClick={analyse}
                  disabled={isBusy}
                  className="mt-2 w-full rounded-2xl px-4 py-2 font-semibold shadow-md transition-transform hover:scale-[1.01]"
                  style={{ background: accent, color: "#07110E" }}
                >
                  {isBusy ? (stableLang(uiLang) === "ES" ? "Ejecutando…" : "Running…") : STR.analyse}
                </button>
                <details className="mt-3 rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
                  <summary className="cursor-pointer select-none text-sm text-neutral-200">{STR.historyHdr}</summary>
                  <div className="mt-2 space-y-2 text-left">
                    {history.length === 0 && <div className="text-xs text-neutral-500">{stableLang(uiLang) === "ES" ? "Sin registros aún" : "No entries yet"}</div>}
                    {history.map((h) => (
                      <div key={h.id} className="rounded-lg border border-neutral-800/80 bg-neutral-900/60 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="text-neutral-300">{new Date(h.ts).toLocaleString()}</div>
                          <div className="text-neutral-200 font-semibold">{h.score}/100</div>
                        </div>
                        {Array.isArray(h.summary3) && h.summary3.length > 0 && (
                          <ul className="mt-2 text-xs text-neutral-400 list-disc pl-4">
                            {h.summary3.slice(0, 3).map((b: string, i: number) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="relative rounded-2xl border border-neutral-800/80 bg-neutral-900/50 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/40 p-5 shadow overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-emerald-300/30 before:to-transparent">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-full" style={ringStyle}>
                  <div className="absolute inset-1 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-200">
                    <span className="text-sm font-bold">{review ? review.score || 0 : 0}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-200">{STR.general}</h3>
                  {review && (
                    <div className="text-xs text-neutral-400">
                      {(stableLang(uiLang) === "ES" ? "Etapa" : "Stage")}: {review.stage || "—"} • {ctx.sector} • {ctx.country}
                    </div>
                  )}
                </div>
              </div>

              {!review ? (
                <p className="mt-4 text-neutral-500 text-sm">{stableLang(uiLang) === "ES" ? "Sube un deck para empezar." : "Upload a deck to get started."}</p>
              ) : (
                <div className="mt-4">
                  <blockquote className="rounded-2xl border border-neutral-800/80 bg-neutral-950 p-4 text-sm leading-relaxed">
                    {S(review.general).split("\n").map((ln, i) => (
                      <div key={i}>{ln}</div>
                    ))}
                  </blockquote>
                </div>
              )}

              {segments && segments.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-neutral-200 font-semibold mb-3">{STR.keyfacts}</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <FactCardRich title={stableLang(uiLang) === "ES" ? "Valoración (compañía)" : "Company valuation"} data={facts.valuation} lang={uiLang} />
                    <FactCardRich title={stableLang(uiLang) === "ES" ? "Tracción" : "Traction"} data={facts.traction} lang={uiLang} />
                    <FactCardRich title={stableLang(uiLang) === "ES" ? "Equipo" : "Team"} data={facts.team} lang={uiLang} />
                    <FactCardRich title={stableLang(uiLang) === "ES" ? "Mercado" : "Market"} data={facts.market} lang={uiLang} />
                    <FactCardRich title={stableLang(uiLang) === "ES" ? "Tamaño del problema" : "Problem size"} data={facts.problem} lang={uiLang} />
                    <FactCard title={stableLang(uiLang) === "ES" ? "Interés para inversores" : "Investor interest"} text={facts.verdict} />
                  </div>
                </div>
              )}

              {segments && segments.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-neutral-200 font-semibold mb-3">{STR.segments}</h4>
                  <div className="space-y-4">
                    {segments.map((s, idx) => (
                      <div key={idx} className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-neutral-100">{s.name}</div>
                          <div className="text-sm text-neutral-300">{s.score}/10</div>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                          <div className="h-full" style={{ width: `${(s.score || 0) * 10}%`, background: "#5CF2C2" }} />
                        </div>
                        <SegmentMatrix lang={uiLang} lanes={s.lanes} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review && (missing?.length > 0 || structGaps.length > 0) ? (
                <div className="mt-8">
                  <h4 className="text-neutral-200 font-semibold mb-3">{STR.sectionsMissing}</h4>
                  <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-4">
                    <ul className="space-y-2 text-sm text-neutral-300 list-disc pl-5">
                      {missing.map((m, i) => (
                        <li key={i}>
                          <span className="font-semibold text-neutral-100">{m.section}:</span> {m.why}
                        </li>
                      ))}
                      {structGaps.map((m, i) => (
                        <li key={`g-${i}`}>
                          <span className="font-semibold text-neutral-100">{m.section}:</span> {m.why}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {segments && segments.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-neutral-200 font-semibold mb-3">{STR.investors}</h4>
                  <InvestorTable lang={uiLang} investors={investorList} />
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => review && copy(review.general)} className="rounded-xl px-3 py-2 border border-neutral-700 hover:bg-neutral-800 text-sm">
                  {stableLang(uiLang) === "ES" ? "Copiar resumen" : "Copy summary"}
                </button>
                <button onClick={() => review && copy(review.detailed)} className="rounded-xl px-3 py-2 border border-neutral-700 hover:bg-neutral-800 text-sm">
                  {stableLang(uiLang) === "ES" ? "Copiar tabla" : "Copy table"}
                </button>
                <button
                  onClick={exportMd}
                  disabled={!review}
                  className="rounded-xl px-3 py-2 font-semibold shadow-md"
                  style={{ background: review ? "#5CF2C2" : "#2a2f35", color: review ? "#07110E" : "#6b7280" }}
                >
                  {STR.export}
                </button>
                {exportUrl ? (
                  <a href={exportUrl} download={`review-${Date.now()}.md`} className="rounded-xl px-3 py-2 border border-neutral-700 hover:bg-neutral-800 text-sm">
                    {STR.download}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-neutral-800 px-4 py-2 text-sm border border-neutral-700 shadow">{toast}</div>
      ) : null}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-20 [background:radial-gradient(circle_at_center,rgba(92,242,194,0.06),transparent_50%)]" />
    </div>
  );
}

function FactCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-4">
      <div className="text-neutral-300 text-xs">{title}</div>
      <div className="text-neutral-100 mt-1">{text}</div>
    </div>
  );
}

function FactCardRich({
  title,
  data,
  lang,
}: {
  title: string;
  lang: string;
  data: { fromDeck: string[]; evaluation: string; benchmark: string; ask?: string | string[] };
}) {
  const L = stableLang(lang);
  const lbl = LBL[L];
  return (
    <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-4">
      <div className="text-neutral-300 text-xs">{title}</div>
      <div className="mt-2 grid gap-2">
        <div>
          <div className="text-neutral-400 text-[11px] uppercase tracking-wide">{lbl.fromDeck}</div>
          <ul className="text-neutral-100 text-sm list-disc pl-5">
            {(data.fromDeck || []).slice(0, 2).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-neutral-400 text-[11px] uppercase tracking-wide">{lbl.evaluation}</div>
          <div className="text-neutral-100 text-sm">{data.evaluation}</div>
        </div>
        {data.ask && (
          <div>
            <div className="text-neutral-400 text-[11px] uppercase tracking-wide">{lbl.ask}</div>
            <div className="text-neutral-100 text-sm">{Array.isArray(data.ask) ? data.ask.join(" • ") : data.ask}</div>
          </div>
        )}
        <div>
          <div className="text-neutral-400 text-[11px] uppercase tracking-wide">{lbl.benchmark}</div>
          <div className="text-neutral-100 text-sm">{data.benchmark}</div>
        </div>
      </div>
    </div>
  );
}

function SegmentMatrix({ lanes, lang }: { lanes: LaneBuckets; lang: string }) {
  const L = stableLang(lang);
  const headers =
    L === "ES" ? ["Qué está bien", "Qué falta", "Por qué importa", "Cómo aportar valor"] : ["What's good", "What's missing", "Why it matters", "How you can add value"];
  const cols = [lanes.good || [], lanes.missing || [], lanes.importance || [], lanes.value || []];
  const rows = Math.max(...cols.map((a) => a.length));
  const rowData = Array.from({ length: rows })
    .map((_, i) => [cols[0][i] || "", cols[1][i] || "", cols[2][i] || "", cols[3][i] || ""])
    .filter((r) => r.some((x) => S(x).trim().length > 0));
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="grid grid-cols-4 gap-3 text-xs text-neutral-400">{headers.map((h, i) => <div key={i}>{h}</div>)}</div>
      <div className="mt-2 divide-y divide-neutral-800">
        {rowData.map((r, i) => (
          <div key={i} className="grid grid-cols-4 gap-3 py-2">
            {r.map((cell, j) => (
              <div key={j} className="text-sm text-neutral-200">
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchBadge({ score }: { score: number }) {
  if (score >= 3) {
    return (
      <span title="Strong match" className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border border-neutral-700 bg-neutral-900">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5CF2C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
        3/3
      </span>
    );
  }
  return (
    <span title={`Match ${score}/3`} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border border-neutral-700 bg-neutral-900">
      {[...Array(3)].map((_, i) => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < score ? "bg-[#5CF2C2]" : "bg-neutral-700"}`}></span>
      ))}
    </span>
  );
}

function InvestorTable({ lang, investors }: { lang: string; investors: RankedInvestor[] }) {
  const L = stableLang(lang);
  const lbl = LBL[L];
  const shown = (investors || []).slice(0, 3);
  const hidden = (investors || []).slice(3);
  return (
    <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-neutral-400">
            <tr className="text-left">
              <th className="py-2 pr-3">{lbl.match}</th>
              <th className="py-2 pr-3">Investor</th>
              <th className="py-2 pr-3">{lbl.linkedin}</th>
              <th className="py-2 pr-3">{lbl.country}</th>
              <th className="py-2 pr-3">{lbl.focus}</th>
              <th className="py-2 pr-3">{lbl.stage}</th>
              <th className="py-2 pr-3">{lbl.check}</th>
              <th className="py-2 pr-3">{lbl.whyMatch}</th>
            </tr>
          </thead>
          <tbody className="text-neutral-200">
            {shown.map((v, i) => (
              <tr key={i} className="border-t border-neutral-800/80">
                <td className="py-2 pr-3">
                  <MatchBadge score={v.matchScore || 0} />
                </td>
                <td className="py-2 pr-3">{v.name}</td>
                <td className="py-2 pr-3">
                  <a href={v.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#5CF2C2] hover:underline">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.84-2.05 3.8-2.05 4.06 0 4.8 2.67 4.8 6.14V23h-4v-6.5c0-1.55-.03-3.55-2.17-3.55-2.18 0-2.52 1.7-2.52 3.45V23h-4V8.5z" />
                    </svg>
                    {lbl.linkedin}
                  </a>
                </td>
                <td className="py-2 pr-3">{v.geo}</td>
                <td className="py-2 pr-3">{v.focus}</td>
                <td className="py-2 pr-3">{v.stages.join(", ")}</td>
                <td className="py-2 pr-3">${v.min.toLocaleString()}–${v.max.toLocaleString()}</td>
                <td className="py-2 pr-3">{v.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden.length > 0 && (
        <div className="mt-3 relative">
          <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/50 p-4 text-center text-neutral-400">{LBL[L].moreInvestors(hidden.length)}</div>
        </div>
      )}
    </div>
  );
}

// ======================= Tiny unit tests =======================
export function runUnitTests() {
  console.assert(["ES", "EN"].includes(stableLang("ES")), "stableLang ES ok");
  console.assert(["ES", "EN"].includes(stableLang("en")), "stableLang en ok");
  console.assert(stableLang("ES-MX") === "ES", "stableLang ES-MX -> ES");
  console.assert(stableLang("fr") === "EN", "stableLang defaults to EN for unknowns");
  console.assert(stableLang(null) === "EN", "stableLang null -> EN");

  const mock = genMock("EN", { sector: "Fintech", country: "LATAM" });
  const parsed = parseDetailed(mock.detailed);
  console.assert(parsed.segments.length >= 6, "segments parsed >=6");
  const hasAsk = parsed.segments.some((s) => /Ask/i.test(s.name));
  console.assert(hasAsk, "Ask row present");

  const facts = deriveKeyFacts(parsed.segments, "EN");
  console.assert(typeof facts.valuation.ask === "string" && facts.valuation.ask.length > 0, "valuation.ask exists");

  const weird = `| Bucket | Score | Improvement |
|--------|-----:|------------|
| Market | 5 | **Why:** a<br>**Improvement:** b|`;
  const p2 = parseDetailed(weird);
  console.assert(p2.segments.length === 1 && p2.segments[0].lanes.missing[0] === "b", "trailing pipe ignored");

  const inv = suggestInvestors("Pre-seed", 8, "Fintech", "México");
  console.assert(inv.length >= 3, "investors >=3");
  console.assert(inv[0].linkedin && /^https:\/\/www.linkedin.com\//.test(inv[0].linkedin), "linkedin url present");
  console.assert(typeof inv[0].why === "string", "why present");
  console.assert(typeof inv[0].matchScore === "number", "matchScore present");
  return true;
}
if (typeof window !== "undefined" && !window.__LATAM_TESTS_RAN__) {
  try {
    window.__LATAM_TESTS_RAN__ = true;
    runUnitTests();
  } catch (e) {
    console.error("Tests failed", e);
  }
}
