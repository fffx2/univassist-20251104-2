const OpenAI = require('openai');

exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Preflight 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { service, platform, keyword, primaryColor, knowledgeBase } = JSON.parse(event.body);

    // 입력값 검증
    if (!service || !platform || !keyword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '필수 입력값이 누락되었습니다.' })
      };
    }

    // OpenAI 클라이언트 초기화
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 플랫폼 가이드라인 추출
    const platformGuide = knowledgeBase?.guidelines?.[platform.toLowerCase()] || {};
    
    // IRI 색상 그룹 추출
    const colorGroup = Object.values(knowledgeBase?.iri_colors || {}).find(group => 
      group.keywords.includes(keyword)
    ) || { key_colors: ['#6666ff', '#ff6b6b', '#f0f0f0'] };

    // AI 프롬프트 생성
    const systemPrompt = `당신은 전문 UX/UI 디자이너입니다. 사용자의 요구사항에 맞는 **완전한 디자인 시스템**을 JSON 형식으로 생성하세요.

**사용자 입력:**
- 서비스 목적: ${service}
- 플랫폼: ${platform}
- 디자인 무드: ${keyword}
- 주조색: ${primaryColor || colorGroup.key_colors[0]}

**플랫폼 가이드라인:**
${JSON.stringify(platformGuide, null, 2)}

**IRI 색상 그룹:**
${JSON.stringify(colorGroup, null, 2)}

**생성 규칙:**
1. **colorSystem**: 주조색(primary), 보조색(secondary), 배경색(background), 텍스트색(text)을 HEX 코드로 생성
2. **fontPairing**: 한글 구글 웹폰트 2개 (헤드라인/본문) + 추천 이유 (한글 3문장)
3. **uxCopy**: 
   - navigation: 서비스에 맞는 네비게이션 메뉴명 5개 (한글)
   - cta: CTA 버튼 텍스트 (한글)
   - cardTitle: 카드 제목 (한글)
   - cardBody: 카드 본문 (한글 2문장)
4. **designRationale**: 이 디자인을 제안한 근거 (한글 5문장)
5. **accessibilityReport**: WCAG 기준 접근성 분석 (한글 4문장)
6. **typography**: 플랫폼별 타이포그래피 규칙 (bodySize, headlineSize, lineHeight 등)

**반환 형식 (JSON):**
{
  "colorSystem": {
    "primary": "#HEX",
    "secondary": "#HEX",
    "background": "#HEX",
    "text": "#HEX"
  },
  "fontPairing": {
    "headline": "Noto Sans KR",
    "body": "Nanum Gothic",
    "rationale": "한글 3문장"
  },
  "uxCopy": {
    "navigation": ["메뉴1", "메뉴2", "메뉴3", "메뉴4", "메뉴5"],
    "cta": "버튼 텍스트",
    "cardTitle": "카드 제목",
    "cardBody": "카드 본문"
  },
  "designRationale": "한글 5문장",
  "accessibilityReport": "한글 4문장",
  "typography": {
    "bodySize": "17pt",
    "headlineSize": "34pt",
    "lineHeight": "1.6"
  }
}`;

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",  // JSON mode 지원 모델
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "위 요구사항에 맞는 디자인 시스템을 JSON으로 생성해주세요." }
      ],
      response_format: { type: "json_object" },  // JSON 모드 강제
      temperature: 0.8,
      max_tokens: 2000
    });

    // AI 응답 파싱
    const aiResponse = JSON.parse(completion.choices[0].message.content);

    // 응답 검증 및 기본값 설정
    const result = {
      colorSystem: aiResponse.colorSystem || {
        primary: primaryColor || '#6666ff',
        secondary: '#ff6b6b',
        background: '#f8f9fa',
        text: '#333333'
      },
      fontPairing: aiResponse.fontPairing || {
        headline: "Noto Sans KR",
        body: "Nanum Gothic",
        rationale: "가독성과 브랜드 이미지를 고려하여 선택했습니다."
      },
      uxCopy: aiResponse.uxCopy || {
        navigation: ["홈", "소개", "서비스", "고객센터", "문의"],
        cta: "시작하기",
        cardTitle: "제목",
        cardBody: "설명"
      },
      designRationale: aiResponse.designRationale || "사용자 경험을 최우선으로 고려한 디자인입니다.",
      accessibilityReport: aiResponse.accessibilityReport || "WCAG 2.1 AA 기준을 충족합니다.",
      typography: aiResponse.typography || platformGuide.typeScale || {
        bodySize: "16px",
        headlineSize: "32px",
        lineHeight: "1.6"
      },
      // 추가 메타데이터
      metadata: {
        service,
        platform,
        keyword,
        generatedAt: new Date().toISOString()
      }
    };

    // 성공 응답 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Fallback 응답 (API 실패 시)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        colorSystem: {
          primary: '#6666ff',
          secondary: '#ff6b6b',
          background: '#f8f9fa',
          text: '#333333'
        },
        fontPairing: {
          headline: "Noto Sans KR",
          body: "Nanum Gothic",
          rationale: "한글 웹폰트로 가장 많이 사용되는 조합입니다. 헤드라인은 굵고 명확하게, 본문은 읽기 편한 폰트를 선택했습니다."
        },
        uxCopy: {
          navigation: ["홈", "소개", "서비스", "고객센터", "문의"],
          cta: "시작하기",
          cardTitle: "서비스 소개",
          cardBody: "사용자 경험을 최우선으로 고려한 서비스입니다. 지금 바로 시작해보세요."
        },
        designRationale: `${keyword} 무드에 맞춰 색상과 타이포그래피를 설계했습니다. ${platform} 플랫폼 가이드라인을 준수하여 일관된 사용자 경험을 제공합니다.`,
        accessibilityReport: "WCAG 2.1 AA 기준의 명도 대비율(4.5:1 이상)을 충족합니다. 색약 사용자를 고려한 색상 조합을 사용했습니다.",
        typography: {
          bodySize: "16px",
          headlineSize: "32px",
          lineHeight: "1.6"
        },
        error: error.message,
        fallback: true
      })
    };
  }
};