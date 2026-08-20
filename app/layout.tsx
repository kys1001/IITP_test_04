import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "이슈 대응·성과 보고서 초안 생성기",
  description: "키워드와 자료를 바탕으로 이슈 대응 및 성과 보고서 초안을 준비합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
