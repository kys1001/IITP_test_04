export const SAVED_REPORTS_KEY = "iitp-saved-reports";

export type SavedReportOutput = { provider: string; text: string; sources: { title: string; url: string }[] };
export type SavedReport = { id: string; title: string; query: string; reportType: string; period: string; createdAt: string; outputs: SavedReportOutput[] };

export function loadSavedReports(): SavedReport[] {
  try { return JSON.parse(localStorage.getItem(SAVED_REPORTS_KEY) ?? "[]") as SavedReport[]; } catch { return []; }
}

export function persistSavedReport(report: SavedReport) {
  const reports = [report, ...loadSavedReports().filter((item) => item.id !== report.id)];
  localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(reports));
  return reports;
}

export function deleteSavedReport(id: string) {
  const reports = loadSavedReports().filter((item) => item.id !== id);
  localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(reports));
  return reports;
}
