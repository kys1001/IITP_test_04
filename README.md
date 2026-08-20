# IITP 이슈 대응·성과 보고서 초안 생성기

순정 Next.js App Router 기반의 이슈 대응 및 성과 보고서 초안 생성기입니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 주요 기능

- OpenAI Web Search와 Gemini Google Search Grounding 연동
- HWP/HWPX/DOCX/PDF/XLSX/XLS 양식 분석
- 업로드 양식의 제목·항목·문단 순서를 보고서 프롬프트에 반영
- API 키는 브라우저 세션에만 저장

## 환경변수

`.env.example`에 아래 변수 목록을 문서화했습니다. 현재 웹 UI는 사용자가 입력한 API 키를 세션 단위로 사용하므로 실제 키를 저장소에 커밋하지 않습니다.

- `OPENAI_API_KEY`: 서버 측 OpenAI 연동을 사용할 때 설정
- `GEMINI_API_KEY`: 서버 측 Gemini 연동을 사용할 때 설정

## 검증

```bash
npm run build
```
