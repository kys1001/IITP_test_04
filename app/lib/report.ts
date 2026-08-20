export type ReportType = "one-page" | "status-response";
export type Period = "7d" | "30d" | "1y" | "all";
export type Source = "government" | "research" | "news" | "company" | "international";
export type ReportInput = { query: string; reportType: ReportType; period: Period; sources: Source[] };
export type ReportDraft = { title: string; summary: string; sections: { heading: string; body: string; points?: string[] }[]; sourceLabel: string };
const periodLabels: Record<Period, string> = { "7d": "최근 7일", "30d": "최근 30일", "1y": "최근 1년", all: "전체 기간" };
export function createMockReport(input: ReportInput): ReportDraft {
  const topic = input.query.trim() || "인공지능 산업 경쟁력 강화";
  const shortTopic = topic.length > 32 ? `${topic.slice(0, 32)}…` : topic;
  if (input.reportType === "one-page") return { title: `${shortTopic} 관련 이슈 대응 및 성과 보고`, sourceLabel: `${periodLabels[input.period]} · ${input.sources.length}개 소스`, summary: "최근 동향과 정책·산업 현장의 주요 신호를 종합한 결과, 선제적 모니터링과 관계기관 간 신속한 정보 공유가 필요한 상황입니다.", sections: [{ heading: "핵심 요약", body: "관련 보도와 공개자료에서 확인되는 변화는 기술 경쟁 심화, 현장 적용 확대, 제도 정비 필요성으로 요약됩니다." }, { heading: "주요 성과", body: "기존 지원사업과 협력 채널을 통해 현장 의견을 수렴하고, 후속 대응을 위한 기초자료를 확보했습니다.", points: ["공개자료 기반 이슈 모니터링 체계 가동", "민관 협력 및 전문가 의견 수렴", "후속 정책 검토를 위한 핵심 쟁점 정리"] }, { heading: "향후 대응", body: "단기적으로 사실관계를 확인하고, 중장기적으로는 데이터 기반의 상시 대응 체계를 고도화합니다." }] };
  return { title: `${shortTopic} 현황 및 대응방향`, sourceLabel: `${periodLabels[input.period]} · 예시 초안`, summary: "입력된 키워드와 선택한 검색 범위를 기준으로 현황을 정리하고, 기관 차원의 대응 우선순위를 제안합니다.", sections: [{ heading: "1. 현황", body: "최근 관련 정보의 언급량과 정책·산업적 관심이 높아지고 있으며, 이해관계자별 대응 수준에 차이가 있습니다." }, { heading: "2. 문제점", body: "자료가 여러 출처에 분산되어 있어 신속한 상황 판단과 일관된 메시지 관리에 한계가 있습니다.", points: ["핵심 데이터의 기준일·출처 통일 필요", "유관기관 간 상황 공유 주기 개선", "현장 체감형 성과지표 보완"] }, { heading: "3. 대응방향", body: "사실 확인-영향 분석-대응 실행의 3단계를 기준으로 실무 협의체를 운영하고, 주요 결과를 정기 보고합니다." }] };
}
