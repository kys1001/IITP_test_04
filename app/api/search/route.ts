import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const OPENAI_MODEL = "gpt-5.6-luna";
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const MAX_SOURCES = 20;
const TIMEOUT_MS = 120_000;

type SearchRequest = { openaiKey?: string; geminiKey?: string; query?: string; reportType?: string; period?: string; sources?: string[]; templateMarkdown?: string };
type Citation = { url: string; title: string; start?: number; end?: number };
type ApiResult = { ok: boolean; text?: string; sources: { title: string; url: string }[]; error?: string };

const sourceDomains: Record<string, string[]> = {
  government: ["go.kr", "gov", "ntis.go.kr"], research: ["doi.org", "arxiv.org", "ncbi.nlm.nih.gov", "nature.com", "science.org"], news: ["reuters.com", "apnews.com", "bbc.com", "yonhapnews.co.kr", "yna.co.kr", "naver.com"], company: ["samsung.com", "lg.com", "microsoft.com", "apple.com", "google.com"], international: ["un.org", "oecd.org", "worldbank.org", "imf.org", "who.int"],
};

function periodLabel(period: string) { return ({ "7d": "최근 7일", "30d": "최근 30일", "1y": "최근 1년", all: "전체 기간" } as Record<string, string>)[period] ?? "전체 기간"; }
function periodStart(period: string) { const days = ({ "7d": 7, "30d": 30, "1y": 365 } as Record<string, number>)[period]; if (!days) return undefined; const date = new Date(); date.setUTCDate(date.getUTCDate() - days); return date.toISOString(); }
function sourceGuidance(sources: string[]) { return sources.length ? sources.map((source) => ({ government: "정부·공공기관", research: "연구·학술", news: "뉴스", company: "기업", international: "국제기구" } as Record<string, string>)[source] ?? source).join(", ") : "모든 출처 유형"; }
function buildPrompt(input: SearchRequest) { const template = input.templateMarkdown?.trim(); return `주제: ${input.query?.trim() || "인공지능 산업 경쟁력 강화"}\n보고서 유형: ${input.reportType ?? "one-page"}\n검색 기간: ${periodLabel(input.period ?? "all")} (반드시 이 기간의 최신 자료를 우선 사용)\n우선 검색할 출처 유형: ${sourceGuidance(input.sources ?? [])}\n\n웹 검색 결과를 근거로 한국어 보고서 초안을 작성하세요. 반드시 아래 8개 섹션 제목을 그대로 사용하세요: 제목, 핵심 요약, 현황, 문제점, 대응방향, 효과성, 시사점, 참고 출처. 각 주장 뒤에는 가능한 경우 [번호] 형태의 인용 표시를 넣으세요. 사실과 추정을 구분하고, 검색 결과에 없는 내용을 지어내지 마세요. 참고 출처 섹션은 본문 인용 번호와 대응해야 합니다.${template ? `\n\n[업로드 양식 분석 결과]\n아래 Markdown은 사용자가 업로드한 원본 양식에서 추출한 구조입니다. 제목·항목명·문단 순서·표 구조를 최대한 유지하고, 보고서 결과가 이 양식의 구조를 따르도록 작성하세요. 양식의 내용을 사실로 간주하지 말고 형식과 순서만 참고하세요.\n---\n${template.slice(0, 120000)}\n---` : ""}`; }

function normalizeUrl(raw: string) { try { const url = new URL(raw); ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) => url.searchParams.delete(key)); url.hash = ""; url.pathname = url.pathname.replace(/\/+$/, "") || "/"; return url.toString(); } catch { return raw; } }
function uniqueCitations(items: Citation[]) { const seen = new Set<string>(); return items.filter((item) => { const key = normalizeUrl(item.url).toLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; }).slice(0, MAX_SOURCES).map((item) => ({ title: item.title || item.url, url: normalizeUrl(item.url) })); }
function addInlineCitations(text: string, citations: Citation[]) { const sources = uniqueCitations(citations); const sourceNumber = (url: string) => sources.findIndex((source) => source.url.toLowerCase() === normalizeUrl(url).toLowerCase()) + 1; const valid = citations.filter((item) => typeof item.end === "number" && item.end > 0 && sourceNumber(item.url) > 0).sort((a, b) => (b.end ?? 0) - (a.end ?? 0)); let result = text; valid.forEach((item) => { const position = Math.min(item.end ?? 0, result.length); result = `${result.slice(0, position)} [${sourceNumber(item.url)}]${result.slice(position)}`; }); const missing = sources.filter((source) => !valid.some((item) => sourceNumber(item.url) === sourceNumber(source.url))).map((source) => `[${sourceNumber(source.url)}]`); return missing.length ? `${result}\n\n근거: ${missing.join(" ")}` : result; }
function getErrorMessage(error: unknown) { return error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."; }

async function fetchJson(url: string, init: RequestInit) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), TIMEOUT_MS); try { const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" }); const body = await response.json().catch(() => ({})); if (!response.ok) { const message = typeof body?.error?.message === "string" ? body.error.message : typeof body?.message === "string" ? body.message : `HTTP ${response.status}`; throw new Error(message); } return body; } finally { clearTimeout(timer); } }

async function searchOpenAI(input: SearchRequest): Promise<ApiResult> {
  const allowedDomains = [...new Set((input.sources ?? []).flatMap((source) => sourceDomains[source] ?? []))];
  try {
    const body = await fetchJson("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${input.openaiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: OPENAI_MODEL, store: false, tools: [{ type: "web_search", filters: { allowed_domains: allowedDomains }, search_context_size: "high" }], input: buildPrompt(input) }) });
    const citations: Citation[] = [];
    const output = Array.isArray(body.output) ? body.output : [];
    output.forEach((item: { content?: unknown[] }) => (item.content ?? []).forEach((content) => { const record = content as { annotations?: unknown[] }; (record.annotations ?? []).forEach((annotation) => { const item = annotation as { type?: string; url?: string; title?: string; start_index?: number; end_index?: number }; if (item.type === "url_citation" && item.url) citations.push({ url: item.url, title: item.title ?? item.url, start: item.start_index, end: item.end_index }); }); }));
    const sources = uniqueCitations(citations); return { ok: true, text: addInlineCitations(typeof body.output_text === "string" ? body.output_text : "OpenAI가 텍스트 결과를 반환하지 않았습니다.", citations), sources };
  } catch (error) { return { ok: false, sources: [], error: getErrorMessage(error instanceof DOMException && error.name === "AbortError" ? new Error("120초 시간 제한을 초과했습니다.") : error) }; }
}

async function searchGemini(input: SearchRequest): Promise<ApiResult> {
  try {
    const start = periodStart(input.period ?? "all"); const googleSearch: Record<string, unknown> = {}; if (start) googleSearch.timeRangeFilter = { startTime: start, endTime: new Date().toISOString() };
    const body = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, { method: "POST", headers: { "x-goog-api-key": input.geminiKey ?? "", "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(input) + `\nGemini 검색 지침: ${sourceGuidance(input.sources ?? [])} 유형의 자료를 우선 검색하세요.` }] }], tools: [{ google_search: googleSearch }] }) });
    const candidate = body.candidates?.[0]; const text = (candidate?.content?.parts ?? []).map((part: { text?: string }) => part.text ?? "").join("\n"); const metadata = candidate?.groundingMetadata ?? candidate?.grounding_metadata ?? {}; const chunks = (metadata.groundingChunks ?? metadata.grounding_chunks ?? []) as { web?: { uri?: string; title?: string } }[]; const webChunks = chunks.map((chunk) => chunk.web).filter((web): web is { uri: string; title?: string } => Boolean(web?.uri)); const citations: Citation[] = webChunks.map((web) => ({ url: web.uri, title: web.title ?? web.uri })); const supports = metadata.groundingSupports ?? metadata.grounding_supports ?? []; supports.forEach((support: { segment?: { endIndex?: number; end_index?: number }; groundingChunkIndices?: number[]; grounding_chunk_indices?: number[] }) => { const indices = support.groundingChunkIndices ?? support.grounding_chunk_indices ?? []; indices.forEach((index) => { if (citations[index]) citations[index].end = support.segment?.endIndex ?? support.segment?.end_index; }); });
    return { ok: true, text: addInlineCitations(text || "Gemini가 텍스트 결과를 반환하지 않았습니다.", citations), sources: uniqueCitations(citations) };
  } catch (error) { return { ok: false, sources: [], error: getErrorMessage(error instanceof DOMException && error.name === "AbortError" ? new Error("120초 시간 제한을 초과했습니다.") : error) }; }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as SearchRequest;
    const openai = typeof input.openaiKey === "string" && input.openaiKey.trim() ? searchOpenAI(input) : Promise.resolve({ ok: false, sources: [], error: "OpenAI API 키가 입력되지 않았습니다." } satisfies ApiResult);
    const gemini = typeof input.geminiKey === "string" && input.geminiKey.trim() ? searchGemini(input) : Promise.resolve({ ok: false, sources: [], error: "Gemini API 키가 입력되지 않았습니다." } satisfies ApiResult);
    const [openaiResult, geminiResult] = await Promise.all([openai, gemini]);
    return NextResponse.json({ openai: openaiResult, gemini: geminiResult });
  } catch { return NextResponse.json({ openai: { ok: false, sources: [], error: "요청 본문을 처리하지 못했습니다." }, gemini: { ok: false, sources: [], error: "요청 본문을 처리하지 못했습니다." } }, { status: 400 }); }
}
