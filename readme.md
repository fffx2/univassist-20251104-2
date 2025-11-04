# TYPOUNIVERSE - AI Design System Generator

**3단계 워크플로우로 전문적인 디자인 시스템을 AI가 자동 생성합니다.**

## 🎯 주요 기능

### 1️⃣ **AI 컬러시스템 설계 (초안 생성)**
- 서비스 목적 + 플랫폼 + 무드 선택
- **OpenAI GPT를 통한 전체 디자인 시스템 생성**
  - 색상 시스템 (주조색, 보조색, 배경색, 텍스트색)
  - 한글 웹폰트 페어링 + 추천 이유
  - UX 카피라이팅 (네비게이션, CTA, 카드 텍스트)
  - 디자인 근거 및 접근성 분석

### 2️⃣ **유니버설 컬러시스템 (검증 및 확정)**
- AI 초안 색상 자동 로드
- 일반인 시야 vs 적록색약 시각 1:1 비교
- WCAG 명도 대비율 실시간 표시
- 사용자가 직접 색상 수정 가능

### 3️⃣ **AI 디자인 리포트 (최종 결과)**
- 수정된 색상 기반 최종 리포트 생성
- 폰트 페어링, 디자인 근거, 컴포넌트 프리뷰
- CSS/SCSS/JS/JSON 코드 Export
- 플랫폼별 타이포그래피 가이드라인

---

## 🚀 배포 방법 (Netlify)

### 1. **Netlify 계정 생성**
- https://app.netlify.com/ 에서 GitHub 연동 회원가입

### 2. **GitHub 레포지토리에 업로드**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/your-repo-name.git
git push -u origin main
```

### 3. **Netlify에서 사이트 생성**
1. Netlify 대시보드에서 "Add new site" → "Import an existing project"
2. GitHub 레포지토리 선택
3. Build settings:
   - **Build command:** (비워두기)
   - **Publish directory:** `.` (루트)
4. "Deploy site" 클릭

### 4. **환경변수 설정 (중요!)**
1. Netlify 사이트 → "Site settings" → "Environment variables"
2. 다음 변수 추가:
   ```
   Key: OPENAI_API_KEY
   Value: sk-proj-xxxxxxxxxxxxx (본인의 OpenAI API 키)
   ```
3. "Save" 클릭

### 5. **재배포**
- 환경변수 설정 후 "Deploys" → "Trigger deploy" → "Clear cache and deploy site"

---

## 🔑 OpenAI API 키 발급 방법

1. https://platform.openai.com/api-keys 접속
2. "Create new secret key" 클릭
3. 키 이름 입력 후 생성
4. **생성된 키를 복사** (다시 볼 수 없음!)
5. Netlify 환경변수에 등록

**예상 비용:** GPT-3.5-turbo 기준 요청당 약 $0.002 (2000회 ≈ $4)

---

## 📂 프로젝트 구조

```
ai-design-system/
├── index.html              # 메인 HTML
├── styles.css              # 기존 디자인 스타일 (Pretendard 폰트)
├── script.js               # AI 기능 강화된 메인 로직
├── knowledge_base.json     # 플랫폼 가이드라인 + IRI 색상
├── functions/              # Netlify Serverless Functions
│   ├── generate-guide.js   # 1단계: AI 초안 생성 (OpenAI 호출)
│   └── recommend-colors.js # 2단계: 실시간 색상 추천
├── netlify.toml            # Netlify 설정
├── package.json            # 의존성 (openai ^4.20.0)
└── .gitignore
```

---

## 🛠️ 로컬 개발

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
`.env` 파일 생성:
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

### 3. Netlify CLI 실행
```bash
npm run dev
# 또는
netlify dev
```

http://localhost:8888 에서 확인

---

## 📊 데이터 흐름

```
1단계 (메인 페이지)
  ↓ 사용자 입력 → OpenAI API 호출
appState.generatedResult (AI 초안 저장)
  ↓
2단계 (유니버설 컬러시스템)
  ↓ AI 초안 색상 자동 로드 → 사용자 수정
appState.labColors (최종 색상 저장)
  ↓
3단계 (AI 리포트)
  ↓ reportData = generatedResult + labColors
최종 리포트 표시 + 코드 Export
```

---

## 🎨 디자인 시스템

- **폰트:** Pretendard Variable (CDN)
- **주요 색상:**
  - Primary: `#6666ff`
  - Accent: `#ff6b6b`
  - Background: `#f8f9fa`
- **레이아웃:** Grid 기반 (1fr 1.5fr)
- **컴포넌트:** 드롭다운, 슬라이더, 태그, 색상 스와치

---

## 🔧 트러블슈팅

### 1. AI 생성 실패 시
- Fallback 모드로 자동 전환 (로컬 생성)
- OpenAI API 키 및 잔액 확인

### 2. Netlify Functions 404 에러
- `netlify.toml`에서 functions 경로 확인
- 환경변수가 올바르게 설정되었는지 확인

### 3. 폰트가 안 보일 때
- Pretendard CDN 링크 확인
- Google Fonts API 차단 여부 확인

---

## 📝 라이선스

MIT License

---

## 👤 제작자

TYPOUNIVERSE Team - AI 기반 디자인 자동화 플랫폼

---

**🎉 배포 완료 후 URL을 공유하면 바로 사용할 수 있습니다!**