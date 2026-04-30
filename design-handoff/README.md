# ohaasa — 코드 핸드오프 패키지

> 매일 아침, 나의 별자리 운세를 가장 먼저 확인하는 앱  
> 버전: v1.1 · 최종 업데이트: 2026년 4월 30일

---

## 파일 구성

```
ohaasa.html   — 전체 디자인 캔버스 (탐색 과정 + Final Flow 포함)
README.md     — 핸드오프 문서 (이 파일)
```

---

## 기술 스택

| 항목 | 내용 |
|---|---|
| 렌더링 | React 18.3.1 + Babel Standalone 7.29.0 |
| 폰트 | DM Sans (UI), Noto Serif JP (타이틀·운세 텍스트) |
| 레이아웃 프레임 | design-canvas.jsx, ios-frame.jsx (외부 의존) |
| 인터랙션 | React useState 기반 (탭 전환, 별자리 선택) |

---

## 디자인 토큰

### 컬러

| 토큰 | 값 | 용도 |
|---|---|---|
| `cream` | `#FAF6F0` | 기본 배경 |
| `cream2` | `#F4EDE3` | 보조 배경 |
| `cream3` | `#EDE3D6` | 구분선·비활성 |
| `sky` | `#B8D8E8` | 방송 pill, 장식 |
| `skyDark` | `#7BAEC7` | sky 계열 텍스트 |
| `yellow` | `#F5D98B` | 별·강조 장식 |
| `apricot` | `#F0B89A` | 카드 하이라이트 |
| `apricotDark` | `#D98A68` | CTA·선택 강조 |
| `lavender` | `#D4C5E8` | 장식 (온보딩) |
| `text` | `#2C2416` | 기본 텍스트 |
| `textMid` | `#6B5C48` | 보조 텍스트 |
| `textSoft` | `#9C8B78` | 캡션·레이블 |

### 배경 그라디언트 (Final Flow 공통)

```
linear-gradient(168deg, #FAF6F0 0%, #F5EBD8 45%, #EDD9C4 80%, #EAD5CE 100%)
```

### 공통 카드 스타일 (`FCARD`)

```js
{
  background: 'rgba(255,253,249,0.75)',
  borderRadius: 20,
  boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
}
// border: '1.5px solid rgba(237,227,214,0.7)'  (FBORDER)
```

---

## 타이포그래피

| 역할 | 폰트 | 크기 | 굵기 |
|---|---|---|---|
| 앱 이름 | Noto Serif JP | 20–40px | 300 |
| 섹션 제목 | Noto Serif JP | 18–22px | 400 |
| 운세 텍스트 | Noto Serif JP | 13px | 300, line-height 2.0 |
| UI 본문 | DM Sans | 13–14px | 400 |
| 레이블 | DM Sans | 10–11px | 400–500 |
| 캡션 | DM Sans | 9–10px | 400, letter-spacing 0.18em |

---

## Final Flow 화면 구성

| 코드 | 컴포넌트 | 설명 |
|---|---|---|
| F1 | `FinalOnboarding` | 최초 실행 — 별자리 constellation 히어로 + 시작하기 CTA |
| F2 | `FinalSignSelection` | 별자리 선택 — 3열 그리드, ConstellationBadge 아이콘 |
| **F3** | **`FinalMainRevised`** | **오늘의 운세 — 최종 확정 (v1.1)** |
| F4 | `FinalAllRankings` | 전체 12개 별자리 순위 리스트 |
| F5 | `FinalSettings` | 설정 — 알림·별자리 변경·앱 정보 |

---

## F3 오늘의 운세 — 레이아웃 스펙 (최종 확정)

> **컴포넌트: `FinalMainRevised`**  
> F3-R 검토 후 최종 확정된 버전입니다.

### 레이아웃 구조

```
┌─────────────────────────────┐
│  배경 장식 (CircleDeco, Star, Moon)        │  position: absolute
│  ───────────────────────────│
│  [스크롤 영역 — flex: 1]                  │  overflowY: auto
│    FHeader                  │
│    FBroadcastPill           │
│    Hero (별자리 + 순위)      │
│    Fortune Card             │
│    Lucky / 오늘의 운 Grid    │
│    <Spacer flex: 1>         │  빈 공간 흡수
│  ───────────────────────────│
│  FBottomNav                 │  화면 하단 고정
└─────────────────────────────┘
```

### 핵심 구현 포인트

| 항목 | 구현 방식 |
|---|---|
| **화면 구조** | `display: flex; flex-direction: column; height: 100%; overflow: hidden` |
| **본문 영역** | `flex: 1; overflow-y: auto` — 콘텐츠 많을 경우 스크롤 가능 |
| **하단 탭바** | 본문 스크롤 영역 **밖**에 배치 → 항상 화면 하단에 고정 |
| **탭바 아래 여백** | 없음 — 탭바가 safe area 근처 화면 하단에 자연스럽게 붙음 |
| **탭바 높이** | 약 58px (padding-top: 12px / padding-bottom: 8px) |
| **빈 공간 처리** | 본문 영역 내 `<div style={{ flex: 1, minHeight: 20 }} />` spacer로 흡수 |

### 콘텐츠 순서

1. `FHeader` — 앱명 + 아바타 버튼
2. `FBroadcastPill` — 방송 날짜 pill
3. Hero — 순위 배지 → ConstellationBadge → 별자리명
4. 운세 텍스트 카드 (Noto Serif JP, line-height 2.05)
5. 행운 아이템 + 오늘의 운 그리드 (2열)
6. Flex spacer
7. `FBottomNav` (고정)

---

## 공유 컴포넌트

| 컴포넌트 | 설명 |
|---|---|
| `FScreenBase` | 전체 화면 래퍼 — 그라디언트 + 장식 + FBottomNav 포함 (F4·F5 사용) |
| `FHeader` | 앱명 + 아바타 아이콘 버튼 |
| `FBroadcastPill` | 방송 날짜 pill (하늘색) |
| `FBottomNav` | 하단 탭바 — 오늘 / 전체 / 설정 |
| `ConstellationBadge` | 별자리 점·선 SVG 아이콘 |
| `ZodiacLineSVG` | 별자리 thin-line 심볼 SVG |
| `StarRating` | ★ 별점 (5점 만점) |

---

## 아이콘 / 일러스트 소스

- **별자리 라인 아이콘**: `ConstellationBadge` (SVG, 인라인, `CONST_LINES` 좌표 기반)
- **장식 요소**: `Star`, `MoonDeco`, `CircleDeco` (인라인 SVG / div)
- **별자리 심볼 문자**: 유니코드 ♈–♓ 사용

---

## 탐색 아트보드 (참고용)

`ohaasa.html` 내 탐색 섹션에 보존되어 있습니다.

- **Onboarding & Sign Selection** — 온보딩 1종, 별자리 선택 5종 변형
- **Main App** — 오늘의 운세 3종, 전체 순위 2종, 설정 2종 + 기존안

---

## 주의사항

- `design-canvas.jsx`, `ios-frame.jsx`가 같은 디렉터리에 있어야 렌더링됩니다.
- Google Fonts (DM Sans, Noto Serif JP) 인터넷 연결이 필요합니다.
- 오프라인 번들이 필요한 경우 별도 요청해 주세요.

---

*ohaasa — おはあさ · 매일 아침 7:30, 당신의 별자리 운세*
