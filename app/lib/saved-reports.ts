import { createClient } from "@supabase/supabase-js";

export const SAVED_REPORTS_KEY = "iitp-saved-reports";
export type SavedReportOutput = { provider: string; text: string; sources: { title: string; url: string }[] };
export type SavedReport = { id: string; title: string; query: string; reportType: string; period: string; createdAt: string; outputs: SavedReportOutput[] };
export type StorageResult<T> = { value: T; remote: boolean };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabasePublishableKey ? createClient(supabaseUrl, supabasePublishableKey) : null;

function loadLocal(): SavedReport[] { try { return JSON.parse(localStorage.getItem(SAVED_REPORTS_KEY) ?? "[]") as SavedReport[]; } catch { return []; } }
function saveLocal(reports: SavedReport[]) { localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(reports)); return reports; }
function fromRow(row: { id: string; title: string; query: string; report_type: string; period: string; created_at: string; outputs: SavedReportOutput[] }): SavedReport { return { id: row.id, title: row.title, query: row.query, reportType: row.report_type, period: row.period, createdAt: row.created_at, outputs: row.outputs }; }
function toRow(report: SavedReport) { return { id: report.id, title: report.title, query: report.query, report_type: report.reportType, period: report.period, created_at: report.createdAt, outputs: report.outputs }; }

export async function loadSavedReports(): Promise<StorageResult<SavedReport[]>> {
  if (supabase) { const { data, error } = await supabase.from("saved_reports").select("id,title,query,report_type,period,created_at,outputs").order("created_at", { ascending: false }); if (!error && data) return { value: data.map((row) => fromRow(row)), remote: true }; }
  return { value: loadLocal(), remote: false };
}

export async function persistSavedReport(report: SavedReport): Promise<StorageResult<SavedReport[]>> {
  if (supabase) { const { error } = await supabase.from("saved_reports").upsert(toRow(report)); if (!error) return loadSavedReports(); }
  return { value: saveLocal([report, ...loadLocal().filter((item) => item.id !== report.id)]), remote: false };
}

export async function deleteSavedReport(id: string): Promise<StorageResult<SavedReport[]>> {
  if (supabase) { const { error } = await supabase.from("saved_reports").delete().eq("id", id); if (!error) return loadSavedReports(); }
  return { value: saveLocal(loadLocal().filter((item) => item.id !== id)), remote: false };
}
