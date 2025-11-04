const OpenAI = require('openai');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { bgColor, textColor, platform } = JSON.parse(event.body);

    if (!bgColor || !textColor) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '색상 정보가 누락되었습니다.' })
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `당신은 웹 접근성 전문가입니다. 다음 색상 조합을 분석하고 **한글로** 실시간 조언을 해주세요.

**현재 색상 조합:**
- 배경색: ${bgColor}
- 텍스트색: ${textColor}
- 플랫폼: ${platform || 'Web'}

**분석 항목:**
1. WCAG 2.1 명도 대비율 평가
2. 색약 사용자 고려사항
3. 개선 제안 (구체적인 HEX 코드 포함)

**응답 형식 (JSON):**
{
  "contrastRatio": "4.5:1",
  "wcagLevel": "AA",
  "recommendation": "한글 조언 (3문장)",
  "suggestedBgColor": "#HEX",
  "suggestedTextColor": "#HEX"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "위 색상 조합을 분석해주세요." }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 500
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Recommend Colors Error:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        contrastRatio: "계산 중...",
        wcagLevel: "검증 필요",
        recommendation: "현재 색상 조합은 시각적으로 적절해 보입니다. WCAG 기준을 확인하려면 좌측 대비율을 참고하세요.",
        suggestedBgColor: "#ffffff",
        suggestedTextColor: "#333333",
        fallback: true
      })
    };
  }
};