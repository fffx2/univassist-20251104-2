// ============================================
// 전역 상태 관리
// - 모든 탭 간 데이터 공유를 위한 중앙 저장소
// ============================================

let appState = {
    service: '',           // 서비스 목적
    platform: '',          // OS/플랫폼
    mood: { soft: 50, static: 50 },  // 무드 슬라이더 값
    keyword: '',           // 선택된 키워드
    primaryColor: '',      // 주조 색상
    generatedResult: null, // AI 생성 결과 (전체 디자인 시스템)
    labColors: {           // 유니버설 컬러시스템에서 설정한 색상
        bgColor: '#F5F5F5',
        textColor: '#333333'
    }
};

let knowledgeBase = {};  // knowledge_base.json 데이터
let typingTimeout;       // 타이핑 효과 타이머
let reportData = null;   // AI 리포트 최종 데이터
let currentCodeTab = 'css';  // 현재 선택된 코드 탭

// ============================================
// 앱 초기화
// ============================================

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        // knowledge_base.json 로드
        const response = await fetch('./knowledge_base.json');
        if (!response.ok) throw new Error('Network response was not ok');
        knowledgeBase = await response.json();
        
        // 각 페이지 초기화
        setupNavigation();
        initializeMainPage();
        initializeLabPage();
        initializeReportPage();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        updateAIMessage("시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.");
    }
}

// ============================================
// 네비게이션 관리
// - 탭 전환 및 데이터 전달
// ============================================

function setupNavigation() {
    document.querySelectorAll('.nav-link, .interactive-button').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.target;
            
            // 모든 페이지 숨기고 타겟만 표시
            document.querySelectorAll('.main-page, .lab-page, .report-page').forEach(page => {
                page.classList.toggle('active', page.id === targetId);
                page.classList.toggle('hidden', page.id !== targetId);
            });
            
            // 네비게이션 링크 활성화 상태 업데이트
            document.querySelectorAll('.nav-link').forEach(nav => {
                nav.classList.toggle('active', nav.dataset.target === targetId);
            });

            // 탭별 데이터 전달 처리
            if (targetId === 'lab-page' && appState.generatedResult) {
                // 1단계 -> 2단계: AI 초안 색상 자동 로드
                loadAiDraftToLab();
            }

            if (targetId === 'report-page') {
                // 2단계 -> 3단계: 최종 확정 리포트 생성
                finalizeAndGenerateReport();
            }
        });
    });
}

// ============================================
// 메인 페이지 (첫 번째 탭 - AI 초안 생성)
// ============================================

function initializeMainPage() {
    initializeDropdowns();
    initializeSliders();
    document.getElementById('generate-btn').addEventListener('click', generateGuide);
    updateAIMessage("안녕하세요! TYPOUNIVERSE AI Design Assistant입니다. 어떤 프로젝트를 위한 디자인 가이드를 찾으시나요?");
}

// 드롭다운 메뉴 초기화
function initializeDropdowns() {
    const services = ['포트폴리오', '브랜드 홍보', '제품 판매', '정보 전달', '학습', '엔터테인먼트'];
    const platforms = ['iOS', 'Android', 'Web', 'Desktop', 'Tablet', 'Wearable', 'VR'];
    
    populateDropdown('service', services);
    populateDropdown('platform', platforms);

    document.getElementById('service-dropdown').addEventListener('click', () => toggleDropdown('service'));
    document.getElementById('platform-dropdown').addEventListener('click', () => toggleDropdown('platform'));
}

function populateDropdown(type, options) {
    const menu = document.getElementById(`${type}-menu`);
    menu.innerHTML = '';
    options.forEach(optionText => {
        const option = document.createElement('div');
        option.className = 'dropdown-option';
        option.textContent = optionText;
        option.onclick = () => selectOption(type, optionText);
        menu.appendChild(option);
    });
}

function toggleDropdown(type) {
    const menu = document.getElementById(`${type}-menu`);
    const otherMenuType = type === 'service' ? 'platform' : 'service';
    document.getElementById(`${otherMenuType}-menu`).classList.remove('show');
    menu.classList.toggle('show');
}

function selectOption(type, value) {
    document.getElementById(`${type}-text`).textContent = value;
    document.getElementById(`${type}-dropdown`).classList.add('selected');
    appState[type] = value;
    toggleDropdown(type);

    // 두 드롭다운 모두 선택되면 다음 단계 표시
    if (appState.service && appState.platform) {
        document.getElementById('step02').classList.remove('hidden');
        updateAIMessage("훌륭해요! 이제 서비스의 핵심 분위기를 정해볼까요? 두 개의 슬라이더를 조절하여 원하는 무드를 찾아주세요.");
    }
}

// 무드 슬라이더 초기화
function initializeSliders() {
    const softHardSlider = document.getElementById('soft-hard-slider');
    const staticDynamicSlider = document.getElementById('static-dynamic-slider');
    
    const updateMoodAndKeywords = () => {
        appState.mood.soft = parseInt(softHardSlider.value);
        appState.mood.static = parseInt(staticDynamicSlider.value);
        
        const keywords = determineKeywords(appState.mood.soft, appState.mood.static);
        displayKeywords(keywords);
    };
    
    softHardSlider.addEventListener('input', updateMoodAndKeywords);
    staticDynamicSlider.addEventListener('input', updateMoodAndKeywords);
}

// 슬라이더 값에 따른 키워드 결정
function determineKeywords(soft, staticValue) {
    if (soft < 50 && staticValue < 50) return knowledgeBase.iri_colors.group2.keywords;
    if (soft < 50 && staticValue >= 50) return knowledgeBase.iri_colors.group1.keywords;
    if (soft >= 50 && staticValue < 50) return knowledgeBase.iri_colors.group3.keywords;
    if (soft >= 50 && staticValue >= 50) return knowledgeBase.iri_colors.group4.keywords;
    return knowledgeBase.iri_colors.group5.keywords;
}

// 키워드 태그 표시
function displayKeywords(keywords) {
    const container = document.getElementById('keyword-tags');
    container.innerHTML = '';
    
    keywords.forEach(keyword => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = keyword;
        tag.onclick = () => selectKeyword(keyword);
        container.appendChild(tag);
    });
    
    document.getElementById('step03').classList.remove('hidden');
    updateAIMessage("좋아요! 이제 서비스의 핵심 감성을 대표할 키워드를 선택해주세요.");
}

// 키워드 선택 처리
function selectKeyword(keyword) {
    appState.keyword = keyword;
    
    // 선택된 키워드 하이라이트
    document.querySelectorAll('.tag').forEach(tag => {
        tag.classList.toggle('selected', tag.textContent === keyword);
    });
    
    // 해당 키워드의 색상 팔레트 표시
    displayColorPalette(keyword);
}

// 색상 팔레트 표시
function displayColorPalette(keyword) {
    const colorGroup = Object.values(knowledgeBase.iri_colors).find(group =>
        group.keywords.includes(keyword)
    );
    
    if (!colorGroup) return;
    
    const colorContainer = document.getElementById('color-selection');
    colorContainer.innerHTML = '';
    const key_colors = colorGroup.key_colors;

    key_colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = color;
        swatch.onclick = () => selectColor(color);
        colorContainer.appendChild(swatch);
    });
    
    document.getElementById('color-selection-wrapper').style.display = 'block';
    updateAIMessage(`'${keyword}' 키워드에 어울리는 대표 색상들입니다. 마음에 드는 주조 색상을 선택해주세요.`);
}

// 주조 색상 선택 처리
function selectColor(color) {
    appState.primaryColor = color;
    
    // 선택된 색상 하이라이트
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('selected', swatch.style.backgroundColor.toLowerCase() === color.toLowerCase());
    });
    
    document.getElementById('generate-btn').classList.remove('hidden');
    updateAIMessage("완벽합니다! 이제 버튼을 눌러 AI가 전문적인 디자인 시스템 초안을 생성하도록 하세요.");
}

// ============================================
// AI 가이드 생성 (핵심 기능 - OpenAI API 호출)
// ============================================

// AI 가이드 생성 (Color System만)
async function generateGuide() {
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> AI 가이드 생성 중...';

    try {
        // Netlify 함수 호출
        const response = await fetch('/.netlify/functions/generate-guide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service: appState.service,
                platform: appState.platform,
                keyword: appState.keyword,
                primaryColor: appState.primaryColor,
                knowledgeBase: knowledgeBase
            })
        });

        if (!response.ok) throw new Error(`API request failed`);
        const data = await response.json();
        
        // API 응답을 기존 형식으로 변환 (이미 서버에서 변환됨)
        displayGeneratedGuide(data);

    } catch (error) {
        console.error('Error fetching AI guide:', error);
        // API 실패 시 로컬 생성
        const localData = generateLocalReport();
        displayGeneratedGuide(localData);
        updateAIMessage("⚠️ AI 서버 연결에 실패하여 기본 가이드를 생성했습니다.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'AI 가이드 생성하기';
        btn.classList.add('hidden');
    }
}

// Fallback 로컬 생성 (API 실패 시)
function generateLocalFallback() {
    const primary = appState.primaryColor || '#6666ff';
    
    return {
        colorSystem: {
            primary: primary,
            secondary: getComplementaryColor(primary),
            background: '#f8f9fa',
            text: '#333333'
        },
        fontPairing: {
            headline: "Noto Sans KR",
            body: "Nanum Gothic",
            rationale: "한글 웹폰트 중 가장 범용적인 조합입니다."
        },
        uxCopy: {
            navigation: ["홈", "소개", "서비스", "고객센터", "문의"],
            cta: "시작하기",
            cardTitle: "서비스 제목",
            cardBody: "서비스를 소개하는 간단한 설명입니다."
        },
        designRationale: `${appState.keyword} 무드에 맞는 색상과 타이포그래피를 설계했습니다.`,
        accessibilityReport: "WCAG 2.1 AA 기준을 충족하도록 설계되었습니다.",
        typography: {
            bodySize: "16px",
            headlineSize: "32px",
            lineHeight: "1.6"
        },
        fallback: true
    };
}

// AI 초안 미리보기 표시 (1단계 우측)
function displayDraftPreview(data) {
    const report = document.getElementById('ai-report');
    
    // Color System 표시
    const colorSystem = data.colorSystem;
    const colors = [
        { id: 'primary-main', color: colorSystem.primary, label: 'Primary' },
        { id: 'secondary-main', color: colorSystem.secondary, label: 'Secondary' },
        { id: 'background-main', color: colorSystem.background, label: 'Background' },
        { id: 'text-main', color: colorSystem.text, label: 'Text' }
    ];
    
    colors.forEach(({ id, color, label }) => {
        const element = document.getElementById(id) || createColorBox(id);
        element.style.backgroundColor = color;
        element.style.color = getContrastingTextColor(color);
        element.querySelector('.color-label').textContent = label;
        element.querySelector('.color-code').textContent = color;
    });
    
    report.style.display = 'block';
    document.getElementById('guidelines').style.display = 'grid';
}

// Color Box 생성 헬퍼 함수
function createColorBox(id) {
    const box = document.createElement('div');
    box.id = id;
    box.className = 'color-box';
    box.innerHTML = `
        <span class="color-label"></span>
        <span class="color-code"></span>
    `;
    document.querySelector('.color-palette').appendChild(box);
    return box;
}

// ============================================
// 유니버설 컬러시스템 페이지 (두 번째 탭 - 색상 검증)
// ============================================

function initializeLabPage() {
    const inputs = ['bg-color-input', 'text-color-input', 'line-height-input', 'font-size-input-pt'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateLab);
        }
    });
    
    document.getElementById('bg-color-picker').addEventListener('input', (e) => {
        document.getElementById('bg-color-input').value = e.target.value;
        updateLab();
    });
    document.getElementById('text-color-picker').addEventListener('input', (e) => {
        document.getElementById('text-color-input').value = e.target.value;
        updateLab();
    });

    updateLab();
}

// 🔥 AI 초안 색상을 2단계로 자동 로드
function loadAiDraftToLab() {
    if (!appState.generatedResult) return;
    
    const { colorSystem } = appState.generatedResult;
    
    // 배경색과 텍스트색을 Color Picker에 자동 적용
    document.getElementById('bg-color-input').value = colorSystem.background;
    document.getElementById('bg-color-picker').value = colorSystem.background;
    document.getElementById('text-color-input').value = colorSystem.text;
    document.getElementById('text-color-picker').value = colorSystem.text;
    
    updateLab();
    
    console.log('✅ AI 초안 색상이 유니버설 컬러시스템에 로드되었습니다.');
}

// 유니버설 컬러시스템 실시간 업데이트
function updateLab() {
    const bgColor = document.getElementById('bg-color-input').value;
    const textColor = document.getElementById('text-color-input').value;
    const lineHeight = document.getElementById('line-height-input').value;
    
    // appState에 현재 색상 저장 (3단계로 전달용)
    appState.labColors = { bgColor, textColor };
    
    // 명도 대비 계산
    const ratio = calculateContrast(bgColor, textColor);
    document.getElementById('contrast-ratio').textContent = ratio.toFixed(2) + ' : 1';
    
    // WCAG 배지 업데이트
    updateWCAGBadge(ratio);
    
    // 일반인 시야 미리보기
    updateNormalVision(bgColor, textColor, lineHeight);
    
    // 적록색약 시야 미리보기
    updateColorblindVision(bgColor, textColor, lineHeight);
}

// WCAG 배지 업데이트
function updateWCAGBadge(ratio) {
    const badge = document.getElementById('wcag-badge');
    if (ratio >= 7) {
        badge.textContent = 'AAA';
        badge.style.background = '#4caf50';
    } else if (ratio >= 4.5) {
        badge.textContent = 'AA';
        badge.style.background = '#2196f3';
    } else {
        badge.textContent = 'Fail';
        badge.style.background = '#f44336';
    }
}

// 일반인 시야 미리보기
function updateNormalVision(bgColor, textColor, lineHeight) {
    const preview = document.getElementById('normal-vision-preview');
    preview.style.backgroundColor = bgColor;
    preview.style.color = textColor;
    preview.style.lineHeight = lineHeight;
}

// 적록색약 시야 미리보기
function updateColorblindVision(bgColor, textColor, lineHeight) {
    const preview = document.getElementById('colorblind-vision-preview');
    preview.style.backgroundColor = simulateColorblind(bgColor);
    preview.style.color = simulateColorblind(textColor);
    preview.style.lineHeight = lineHeight;
}

// 적록색약 시뮬레이션 (Deuteranopia)
function simulateColorblind(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    // Deuteranopia 변환 매트릭스
    const r = 0.625 * rgb.r + 0.375 * rgb.g;
    const g = 0.7 * rgb.r + 0.3 * rgb.g;
    const b = 0.3 * rgb.g + 0.7 * rgb.b;
    
    return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
}

// ============================================
// AI 리포트 페이지 (세 번째 탭 - 최종 결과)
// ============================================

function initializeReportPage() {
    // 코드 탭 전환
    document.querySelectorAll('.export-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            currentCodeTab = e.target.dataset.lang;
            document.querySelectorAll('.export-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            updateCodeExport();
        });
    });
    
    // 코드 복사 버튼
    document.getElementById('copy-code-btn').addEventListener('click', copyCode);
}

// 🔥 2단계에서 3단계로 이동 시: 최종 확정
function finalizeAndGenerateReport() {
    if (!appState.generatedResult) {
        alert('먼저 1단계에서 AI 초안을 생성해주세요.');
        return;
    }
    
    // reportData에 최종 확정 데이터 복사
    reportData = { ...appState.generatedResult };
    
    // 2단계에서 수정한 색상으로 덮어쓰기
    reportData.colorSystem.background = appState.labColors.bgColor;
    reportData.colorSystem.text = appState.labColors.textColor;
    
    // 리포트 표시
    displayReportData(reportData);
}

// 최종 리포트 표시
function displayReportData(data) {
    if (!data) {
        document.getElementById('report-title').textContent = '리포트 없음';
        document.getElementById('report-subtitle').textContent = '먼저 1, 2단계를 완료해주세요.';
        return;
    }
    
    // 동적 부제목
    document.getElementById('report-subtitle').textContent = 
        `'${appState.service}'을(를) 위한 최종 디자인 시스템 가이드입니다.`;
    
    // 1. 폰트 페어링 표시
    displayFontPairing(data.fontPairing);
    
    // 2. 디자인 근거 표시
    displayDesignRationale(data.designRationale);
    
    // 3. 최종 컬러 시스템 표시
    displayFinalColorSystem(data.colorSystem);
    
    // 4. UX 카피 및 컴포넌트 프리뷰
    displayUxCopyPreview(data.uxCopy, data.colorSystem);
    
    // 5. 코드 Export
    updateCodeExport();
    
    // 6. 접근성 분석
    displayAccessibilityReport(data.accessibilityReport);
}

// 폰트 페어링 표시
function displayFontPairing(fontPairing) {
    loadGoogleFont(fontPairing.headline);
    loadGoogleFont(fontPairing.body);
    
    document.getElementById('headline-font-preview').style.fontFamily = fontPairing.headline;
    document.getElementById('headline-font-preview').textContent = fontPairing.headline;
    document.getElementById('headline-font-name').textContent = fontPairing.headline;
    
    document.getElementById('body-font-preview').style.fontFamily = fontPairing.body;
    document.getElementById('body-font-preview').textContent = fontPairing.body;
    document.getElementById('body-font-name').textContent = fontPairing.body;
    
    document.getElementById('font-rationale').textContent = fontPairing.rationale;
}

// Google Fonts 동적 로드
function loadGoogleFont(fontName) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}:wght@400;600;700&display=swap`;
    document.head.appendChild(link);
}

// 디자인 근거 표시
function displayDesignRationale(rationale) {
    document.getElementById('design-rationale-text').textContent = rationale;
}

// 최종 컬러 시스템 표시
function displayFinalColorSystem(colorSystem) {
    const shades = [
        { id: 'final-primary', color: colorSystem.primary, label: 'Primary' },
        { id: 'final-secondary', color: colorSystem.secondary, label: 'Secondary' },
        { id: 'final-background', color: colorSystem.background, label: 'Background' },
        { id: 'final-text', color: colorSystem.text, label: 'Text' }
    ];
    
    shades.forEach(({ id, color, label }) => {
        const box = document.getElementById(id);
        if (box) {
            box.style.backgroundColor = color;
            box.style.color = getContrastingTextColor(color);
            box.querySelector('.shade-label').textContent = label;
            box.querySelector('.shade-hex').textContent = color;
        }
    });
}

// UX 카피 프리뷰
function displayUxCopyPreview(uxCopy, colorSystem) {
    // 네비게이션 바
    const navbar = document.getElementById('demo-navbar');
    navbar.style.backgroundColor = colorSystem.background;
    navbar.style.color = colorSystem.text;
    
    const navLinks = navbar.querySelectorAll('.demo-nav-links a');
    uxCopy.navigation.slice(0, 5).forEach((text, i) => {
        if (navLinks[i]) {
            navLinks[i].textContent = text;
            navLinks[i].style.color = colorSystem.text;
        }
    });
    
    // CTA 버튼
    document.querySelectorAll('.demo-btn-primary').forEach(btn => {
        btn.textContent = uxCopy.cta;
        btn.style.backgroundColor = colorSystem.primary;
        btn.style.color = getContrastingTextColor(colorSystem.primary);
    });
    
    // 카드
    document.querySelectorAll('.demo-card h4').forEach((h4, i) => {
        h4.textContent = uxCopy.cardTitle;
    });
    document.querySelectorAll('.demo-card p').forEach((p, i) => {
        p.textContent = uxCopy.cardBody;
    });
}

// 코드 Export 업데이트
function updateCodeExport() {
    const codeOutput = document.getElementById('code-output');
    const colorSystem = reportData?.colorSystem || {};
    
    let code = '';
    
    if (currentCodeTab === 'css') {
        code = `:root {
  --primary-color: ${colorSystem.primary};
  --secondary-color: ${colorSystem.secondary};
  --background-color: ${colorSystem.background};
  --text-color: ${colorSystem.text};
}`;
    } else if (currentCodeTab === 'scss') {
        code = `$primary-color: ${colorSystem.primary};
$secondary-color: ${colorSystem.secondary};
$background-color: ${colorSystem.background};
$text-color: ${colorSystem.text};`;
    } else if (currentCodeTab === 'js') {
        code = `export const colors = {
  primary: '${colorSystem.primary}',
  secondary: '${colorSystem.secondary}',
  background: '${colorSystem.background}',
  text: '${colorSystem.text}'
};`;
    } else if (currentCodeTab === 'json') {
        code = JSON.stringify({ colorSystem }, null, 2);
    }
    
    codeOutput.textContent = code;
}

// 코드 복사
function copyCode() {
    const code = document.getElementById('code-output').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-code-btn');
        btn.textContent = '복사 완료!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = '코드 복사';
            btn.classList.remove('copied');
        }, 2000);
    });
}

// 접근성 분석 표시
function displayAccessibilityReport(report) {
    document.getElementById('accessibility-report-text').textContent = report || 'WCAG 2.1 기준을 준수합니다.';
}

// ============================================
// 유틸리티 함수들
// ============================================

// AI 메시지 업데이트 (타이핑 효과)
function updateAIMessage(message) {
    const element = document.getElementById('ai-message');
    element.textContent = '';
    
    clearTimeout(typingTimeout);
    
    let index = 0;
    function typeCharacter() {
        if (index < message.length) {
            element.textContent += message.charAt(index);
            index++;
            typingTimeout = setTimeout(typeCharacter, 20);
        }
    }
    typeCharacter();
}

// 명도 대비 계산
function calculateContrast(color1, color2) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 1;
    
    const l1 = relativeLuminance(rgb1);
    const l2 = relativeLuminance(rgb2);
    
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function relativeLuminance({ r, g, b }) {
    const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// 색상 대비 텍스트 색상 반환
function getContrastingTextColor(hexColor) {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return '#333333';
    const luminance = relativeLuminance(rgb);
    return luminance > 0.5 ? '#333333' : '#FFFFFF';
}

// 보색 계산
function getComplementaryColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#ff6b6b';
    
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.h = (hsl.h + 180) % 360;
    
    const complementRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(complementRgb.r, complementRgb.g, complementRgb.b);
}

// 색상 밝게 하기
function lightenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * (percent / 100)));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * (percent / 100)));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * (percent / 100)));
    
    return rgbToHex(r, g, b);
}

// 색상 어둡게 하기
function darkenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    const r = Math.max(0, Math.round(rgb.r * (1 - percent / 100)));
    const g = Math.max(0, Math.round(rgb.g * (1 - percent / 100)));
    const b = Math.max(0, Math.round(rgb.b * (1 - percent / 100)));
    
    return rgbToHex(r, g, b);
}

// HEX -> RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// RGB -> HEX
function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, x)).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join('');
}

// RGB -> HSL
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

// HSL -> RGB
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