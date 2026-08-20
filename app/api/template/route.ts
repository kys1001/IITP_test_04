import { NextResponse } from "next/server";
import { parse } from "kordoc";

export const runtime = "nodejs";
export const maxDuration = 120;

const supported = new Set(["hwp", "hwpx", "docx", "pdf", "xlsx", "xls"]);

function extensionOf(name: string) { return name.toLowerCase().split(".").pop() ?? ""; }

export async function POST(request: Request) {
  let fileName = "알 수 없는 파일";
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (!(entry instanceof File)) return NextResponse.json({ ok: false, fileName, error: "업로드할 파일을 선택해 주세요." }, { status: 400 });
    fileName = entry.name;
    const extension = extensionOf(fileName);
    if (!supported.has(extension)) return NextResponse.json({ ok: false, fileName, fileType: extension || "unknown", error: `지원하지 않는 파일 형식입니다: .${extension || "알 수 없음"}. HWP, HWPX, DOCX, PDF, XLSX, XLS 파일만 업로드할 수 있습니다.` }, { status: 415 });
    const result = await parse(Buffer.from(await entry.arrayBuffer()), { keepTrailingEmptyCols: true, keepEmptyParagraphs: true });
    if (!result.success) return NextResponse.json({ ok: false, fileName, fileType: result.fileType, error: `${result.error}${result.code ? ` (${result.code})` : ""}` }, { status: 422 });
    const markdown = result.markdown.trim();
    if (!markdown) return NextResponse.json({ ok: false, fileName, fileType: result.fileType, error: "문서에서 분석할 텍스트와 구조를 찾지 못했습니다." }, { status: 422 });
    return NextResponse.json({ ok: true, fileName, fileType: result.fileType, markdown, outline: result.outline ?? [], metadata: result.metadata ?? {}, warnings: result.warnings ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "문서 분석 중 알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, fileName, error: `${message} 파일 형식이 올바른지, 문서가 손상되거나 암호화되어 있지 않은지 확인해 주세요.` }, { status: 422 });
  }
}
