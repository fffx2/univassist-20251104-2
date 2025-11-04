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
    const systemPrompt = `당신은 전문 UX/UI 디자이너입니다. 사용자의 요구사항에 맞는 디자인 시스템을 JSON 형식으로 생성하세요.

**사용자 입력:**
- 서비스 목적: ${service}
- 플랫폼: ${platform}
- 디자인 무드: ${keyword}
- 주조색: ${primaryColor || colorGroup.key_colors[0]}

**생성 규칙:**
1. colorSystem: primary, secondary 색상을 HEX 코드로 생성
2. fontPairing: 한글 구글 웹폰트 2개 (headline/body) + 추천 이유
3. uxCopy: navigation(5개), cta, cardTitle, cardBody
4. designRationale: 디자인 근거 (한글)
5. accessibilityReport: 접근성 분석 (한글)

**반환 형식 (JSON):**
{
  "colorSystem": {
    "primary": "#HEX",
    "secondary": "#HEX"
  },
  "fontPairing": {
    "headline": "폰트명",
    "body": "폰트명",
    "rationale": "한글 설명"
  },
  "uxCopy": {
    "navigation": ["메뉴1", "메뉴2", "메뉴3", "메뉴4", "메뉴5"],
    "cta": "버튼텍스트",
    "cardTitle": "제목",
    "cardBody": "본문"
  },
  "designRationale": "한글 설명",
  "accessibilityReport": "한글 설명"
}`;

    // OpenAI API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "위 요구사항에 맞는 디자인 시스템을 JSON으로 생성해주세요." }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2000
    });

    // AI 응답 파싱
    const aiResponse = JSON.parse(completion.choices[0].message.content);

    // 응답을 기존 형식에 맞게 변환 (중요!)
    const primary = aiResponse.colorSystem?.primary || primaryColor || colorGroup.key_colors[0];
    const secondary = aiResponse.colorSystem?.secondary || colorGroup.key_colors[1];
    
    const result = {
      colorSystem: {
        primary: {
          main: primary,
          light: lightenColor(primary, 20),
          dark: darkenColor(primary, 20)
        },
        secondary: {
          main: secondary,
          light: lightenColor(secondary, 20),
          dark: darkenColor(secondary, 20)
        }
      },
      accessibility: {
        textColorOnPrimary: getContrastingTextColor(primary),
        contrastRatio: calculateContrast(primary, getContrastingTextColor(primary)).toFixed(2) + ':1'
      },
      fontPairing: aiResponse.fontPairing || {
        headline: "Noto Sans KR",
        body: "Nanum Gothic",
        korean: "Noto Sans KR",
        rationale: "한글 웹폰트로 가장 많이 사용되는 조합입니다."
      },
      uxCopy: aiResponse.uxCopy || {
        navigation: ["홈", "소개", "서비스", "고객센터", "문의"],
        cta: "시작하기",
        cardTitle: "서비스 소개",
        cardBody: "사용자 경험을 최우선으로 고려한 서비스입니다."
      },
      designRationale: aiResponse.designRationale || `${keyword} 무드에 맞춰 색상과 타이포그래피를 설계했습니다.`,
      accessibilityReport: aiResponse.accessibilityReport || "WCAG 2.1 AA 기준을 충족합니다."
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Fallback 응답
    const primary = primaryColor || '#6666ff';
    const secondary = getComplementaryColor(primary);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        colorSystem: {
          primary: {
            main: primary,
            light: lightenColor(primary, 20),
            dark: darkenColor(primary, 20)
          },
          secondary: {
            main: secondary,
            light: lightenColor(secondary, 20),
            dark: darkenColor(secondary, 20)
          }
        },
        accessibility: {
          textColorOnPrimary: getContrastingTextColor(primary),
          contrastRatio: calculateContrast(primary, getContrastingTextColor(primary)).toFixed(2) + ':1'
        },
        fontPairing: {
          headline: "Noto Sans KR",
          body: "Nanum Gothic",
          korean: "Noto Sans KR",
          rationale: "한글 웹폰트로 가장 많이 사용되는 조합입니다."
        },
        fallback: true,
        error: error.message
      })
    };
  }
};

// ============================================
// 헬퍼 함수들
// ============================================

function lightenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * (percent / 100)));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * (percent / 100)));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * (percent / 100)));
  
  return rgbToHex(r, g, b);
}

function darkenColor(hex, percent) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const r = Math.max(0, Math.round(rgb.r * (1 - percent / 100)));
  const g = Math.max(0, Math.round(rgb.g * (1 - percent / 100)));
  const b = Math.max(0, Math.round(rgb.b * (1 - percent / 100)));
  
  return rgbToHex(r, g, b);
}

function getComplementaryColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ff6b6b';
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.h = (hsl.h + 180) % 360;
  
  const complementRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(complementRgb.r, complementRgb.g, complementRgb.b);
}

function getContrastingTextColor(hexColor) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#333333';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#333333' : '#FFFFFF';
}

function calculateContrast(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function getLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, x)).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s, l: l };
}

function hslToRgb(h, s, l) {
  h /= 360;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}