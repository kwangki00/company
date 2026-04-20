import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `당신은 한국 주식시장(KRX/KOSDAQ/KOSPI) 전문 기업 분석가입니다.
사용자가 종목명 또는 종목코드를 입력하면, 구글 검색을 통해 최신 정보를 수집하여 아래 JSON 형식으로만 응답하세요.

반드시 아래 JSON 형식만 출력하세요. 
{
  "company": {
    "name": "회사명",
    "code": "종목코드 6자리",
    "market": "KOSPI 또는 KOSDAQ",
    "sector": "업종",
    "theme": ["관련 테마1", "관련 테마2", "관련 테마3"],
    "description": "회사 핵심 사업 설명 (2-3문장)"
  },
  "price": {
    "current": 현재가(숫자),
    "change_pct": 등락률(숫자, 예: 2.5 또는 -1.3),
    "high_52w": 52주 최고가(숫자),
    "low_52w": 52주 최저가(숫자),
    "volume_avg": "평균 거래량 텍스트"
  },
  "fundamentals": {
    "market_cap": "시가총액 텍스트 (예: 1조 2,340억)",
    "market_cap_rank": "시총 순위 또는 규모 등급",
    "per": PER(숫자 또는 null),
    "fwd_per": 선행PER(숫자 또는 null),
    "pbr": PBR(숫자 또는 null),
    "roe": ROE(숫자, % 단위 또는 null),
    "eps": EPS(숫자 또는 null),
    "bps": BPS(숫자 또는 null),
    "div_yield": 배당수익률(숫자, % 단위 또는 null),
    "debt_ratio": 부채비율(숫자, % 단위 또는 null),
    "revenue": "최근 매출액 텍스트",
    "op_profit": "최근 영업이익 텍스트",
    "net_profit": "최근 순이익 텍스트",
    "revenue_growth": 매출 성장률(숫자, % 또는 null),
    "profit_growth": 영업이익 성장률(숫자, % 또는 null)
  },
  "consensus": {
    "target_price": 목표주가 컨센서스(숫자 또는 null),
    "upside_pct": 상승여력(숫자, % 또는 null),
    "rating": "투자의견 (예: 매수, 중립, 비중확대 등)",
    "analyst_count": 커버 애널리스트 수(숫자 또는 null),
    "reports": [
      {
        "broker": "증권사명",
        "date": "YYYY-MM-DD 또는 최근",
        "rating": "투자의견",
        "target": 목표가(숫자),
        "comment": "핵심 코멘트 1줄"
      }
    ]
  },
  "earnings_forecast": {
    "current_year": {
      "year": "2025E 또는 2026E",
      "revenue": "매출 전망 텍스트",
      "op_profit": "영업이익 전망 텍스트",
      "net_profit": "순이익 전망 텍스트",
      "eps": EPS 전망(숫자 또는 null),
      "per": 예상 PER(숫자 또는 null)
    },
    "next_year": {
      "year": "2026E 또는 2027E",
      "revenue": "매출 전망 텍스트",
      "op_profit": "영업이익 전망 텍스트",
      "net_profit": "순이익 전망 텍스트",
      "eps": EPS 전망(숫자 또는 null),
      "per": 예상 PER(숫자 또는 null)
    }
  },
  "swing_signal": {
    "short_trend": "단기 추세 (상승/횡보/하락)",
    "medium_trend": "중기 추세 (상승/횡보/하락)",
    "support": "주요 지지선 가격대 텍스트",
    "resistance": "주요 저항선 가격대 텍스트",
    "volume_trend": "거래량 동향 텍스트",
    "supply_demand": "수급 동향 요약 (외국인/기관 매매 동향)",
    "catalyst": ["단기 모멘텀/카탈리스트 1", "카탈리스트 2"],
    "risk": ["리스크 요인 1", "리스크 요인 2"]
  },
  "news_summary": ["최신 주요 뉴스 1", "최신 주요 뉴스 2", "최신 주요 뉴스 3"],
  "overall_score": {
    "value": 종합점수(1-10 숫자),
    "grade": "A+ ~ F 등급",
    "comment": "종합 한줄평"
  }
}

검색으로 찾을 수 없는 항목은 null로 두되, 최대한 많은 정보를 채워주세요.
증권사 리포트는 최소 2~3개 이상 찾아주세요.`;

function Badge({ children, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[color]}`}>
      {children}
    </span>
  );
}

function Card({ title, icon, children, className = "" }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-5 shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className="text-lg">{icon}</span>}
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function Metric({ label, value, sub, highlight }) {
  if (value === null || value === undefined || value === "null") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${highlight || "text-gray-900"}`}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-gray-400">{sub}</span>}
    </div>
  );
}

function TrendArrow({ trend }) {
  if (!trend) return null;
  const isUp = trend.includes("상승");
  const isDown = trend.includes("하락");
  return (
    <span className={`font-semibold ${isUp ? "text-emerald-600" : isDown ? "text-red-600" : "text-amber-600"}`}>
      {isUp ? "▲ " : isDown ? "▼ " : "► "}{trend}
    </span>
  );
}

function ScoreRing({ score, grade }) {
  const pct = (score / 10) * 100;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = score >= 7 ? "#059669" : score >= 5 ? "#d97706" : "#dc2626";
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }}
        />
        <text x="60" y="52" textAnchor="middle" fill={color} fontSize="28" fontWeight="800">{score}</text>
        <text x="60" y="72" textAnchor="middle" fill="#64748b" fontSize="13" fontWeight="600">{grade}</text>
      </svg>
    </div>
  );
}

function LoadingPulse({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-b-purple-500 animate-spin" style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
      </div>
      <p className="text-gray-500 text-sm animate-pulse">{text}</p>
    </div>
  );
}

export default function StockDashboard() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const [saving, setSaving] = useState(false);

  const sendPrompt = (payload) => {
    console.log("Drive 저장 요청됨:", payload);
    alert("테스트 환경입니다. 로컬 콘솔에 JSON 데이터가 출력되었습니다.");
    setSaving(false);
  };

  const messages = [
    "구글 실시간 검색 중...",
    "기업 재무데이터 수집 중...",
    "최신 증권사 리포트 확인 중...",
    "스윙 트레이딩 시그널 분석 중...",
    "대시보드 생성 중..."
  ];

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    setLoadMsg(messages[0]);
    const iv = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadMsg(messages[i]);
    }, 3000);
    return () => clearInterval(iv);
  }, [loading]);

async function analyze() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const API_KEY = "AQ.Ab8RN6JQrKrHeMw8bV8-eUIs-9Ab_UDk-hcARr7PwkVFXStsLA"; 
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [{ 
            role: "user", 
            parts: [{ text: `다음 종목을 구글 실시간 검색을 활용해 가장 최신 정보로 분석해주세요: ${query.trim()}` }] 
          }],
          generationConfig: {
            // 🔥 에러의 원인이었던 responseMimeType 설정을 삭제했습니다.
            temperature: 0.2, 
          },
          tools: [
            { googleSearch: {} } // 🔥 주식 분석의 핵심인 구글 검색은 유지!
          ]
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || `HTTP 에러 ${res.status}`);
      }

      const json = await res.json();
      
      // AI가 반환한 텍스트 추출
      const textOutput = json.candidates[0].content.parts[0].text;
      
      // 🔥 AI가 백틱(```json)을 붙여서 대답하더라도 에러가 나지 않도록 텍스트를 정제합니다.
      const cleaned = textOutput.replace(/```json|```/g, "").trim();
      
      const parsed = JSON.parse(cleaned);
      setData(parsed);
      
    } catch (e) {
      console.error("통신 에러 상세:", e);
      setError(`분석 실패: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }
  function exportHTML(d) {
    const chg = d.price?.change_pct;
    const chgSign = chg > 0 ? "+" : "";
    const chgColor = chg > 0 ? "#dc2626" : chg < 0 ? "#2563eb" : "#666";
    const scoreColor = d.overall_score?.value >= 7 ? "#059669" : d.overall_score?.value >= 5 ? "#d97706" : "#dc2626";
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${d.company?.name} 기업분석 리포트</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans KR',-apple-system,sans-serif;color:#111;background:#fff;padding:24px 32px;font-size:13px;line-height:1.6}
h1{font-size:22px;margin-bottom:4px}
h2{font-size:14px;color:#666;text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px;padding-bottom:6px;border-bottom:2px solid #eee}
.header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #111;padding-bottom:12px;margin-bottom:16px}
.badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:99px;border:1px solid #ddd;margin-right:4px;background:#f8f8f8}
.grid{display:grid;gap:12px}
.grid2{grid-template-columns:1fr 1fr}
.grid3{grid-template-columns:1fr 1fr 1fr}
.grid5{grid-template-columns:1fr 1fr 1fr 1fr 1fr}
.card{border:1px solid #e5e7eb;border-radius:8px;padding:14px}
.metric-label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.5px}
.metric-value{font-size:16px;font-weight:700}
.report-row{display:flex;gap:12px;align-items:center;padding:8px 10px;background:#f9f9f9;border-radius:6px;margin-bottom:6px;font-size:12px}
.report-row .broker{font-weight:700;min-width:80px}
.report-row .tp{color:#d97706;font-weight:700}
.trend-up{color:#059669;font-weight:600}
.trend-down{color:#dc2626;font-weight:600}
.trend-side{color:#d97706;font-weight:600}
.footer{text-align:center;font-size:10px;color:#aaa;margin-top:24px;padding-top:12px;border-top:1px solid #eee}
@media print{body{padding:12px 16px}@page{size:A4;margin:10mm}}
</style></head><body>
<div class="header">
  <div>
    <h1>${d.company?.name} <span class="badge">${d.company?.market}</span> <span style="font-size:13px;color:#999">${d.company?.code}</span></h1>
    <div style="color:#666;font-size:12px">${d.company?.sector}</div>
    <div style="margin-top:6px">${(d.company?.theme||[]).map(t=>`<span class="badge">${t}</span>`).join(" ")}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:26px;font-weight:900">${d.price?.current?.toLocaleString()}<span style="font-size:12px;color:#999"> 원</span></div>
    <div style="font-size:16px;font-weight:700;color:${chgColor}">${chgSign}${chg}%</div>
  </div>
</div>

${d.company?.description ? `<p style="font-size:12px;color:#555;margin-bottom:16px;padding:10px;background:#f9f9f9;border-radius:6px">${d.company.description}</p>` : ""}

<div class="grid grid3" style="margin-bottom:16px">
  <div class="card" style="text-align:center">
    <h2 style="border:0;margin:0 0 8px">🎯 종합 평가</h2>
    <div style="font-size:36px;font-weight:900;color:${scoreColor}">${d.overall_score?.value || "-"}</div>
    <div style="font-size:14px;font-weight:700;color:${scoreColor}">${d.overall_score?.grade || "-"}</div>
    <div style="font-size:12px;color:#666;margin-top:6px">${d.overall_score?.comment || ""}</div>
  </div>
  <div class="card">
    <h2 style="border:0;margin:0 0 8px">📈 가격 밴드</h2>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#999"><span>52주 최저</span><span>현재가</span><span>52주 최고</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:4px">
      <span style="color:#2563eb">${d.price?.low_52w?.toLocaleString()}</span>
      <span>${d.price?.current?.toLocaleString()}</span>
      <span style="color:#dc2626">${d.price?.high_52w?.toLocaleString()}</span>
    </div>
    <div style="margin-top:8px"><span class="metric-label">평균 거래량</span><div>${d.price?.volume_avg || "-"}</div></div>
  </div>
  <div class="card">
    <h2 style="border:0;margin:0 0 8px">🏦 컨센서스</h2>
    <div style="display:flex;justify-content:space-between"><span class="metric-label">목표주가</span><span style="font-size:18px;font-weight:900;color:#d97706">${d.consensus?.target_price?.toLocaleString()||"-"}</span></div>
    <div style="display:flex;justify-content:space-between;margin-top:4px"><span class="metric-label">상승여력</span><span style="font-weight:700;color:${(d.consensus?.upside_pct||0)>0?"#dc2626":"#2563eb"}">${d.consensus?.upside_pct>0?"+":""}${d.consensus?.upside_pct||"-"}%</span></div>
    <div style="margin-top:8px"><span class="badge" style="background:#ecfdf5;border-color:#a7f3d0;color:#059669">${d.consensus?.rating||"-"}</span> <span style="font-size:11px;color:#999">${d.consensus?.analyst_count||0}명 커버</span></div>
  </div>
</div>

<h2>📋 핵심 재무지표</h2>
<div class="grid grid5" style="margin-bottom:8px">
  ${[["시가총액",d.fundamentals?.market_cap],["PER",d.fundamentals?.per],["선행PER",d.fundamentals?.fwd_per],["PBR",d.fundamentals?.pbr],["ROE",d.fundamentals?.roe!=null?d.fundamentals.roe+"%":null],["EPS",d.fundamentals?.eps?.toLocaleString()],["BPS",d.fundamentals?.bps?.toLocaleString()],["배당수익률",d.fundamentals?.div_yield!=null?d.fundamentals.div_yield+"%":null],["부채비율",d.fundamentals?.debt_ratio!=null?d.fundamentals.debt_ratio+"%":null],["시총등급",d.fundamentals?.market_cap_rank]].filter(([,v])=>v!=null).map(([l,v])=>`<div><div class="metric-label">${l}</div><div class="metric-value">${v}</div></div>`).join("")}
</div>
<div class="grid grid3">
  <div><span class="metric-label">매출액</span><div style="font-weight:600">${d.fundamentals?.revenue||"-"}</div>${d.fundamentals?.revenue_growth!=null?`<div style="font-size:11px;color:${d.fundamentals.revenue_growth>0?"#059669":"#dc2626"}">${d.fundamentals.revenue_growth>0?"+":""}${d.fundamentals.revenue_growth}% YoY</div>`:""}</div>
  <div><span class="metric-label">영업이익</span><div style="font-weight:600">${d.fundamentals?.op_profit||"-"}</div>${d.fundamentals?.profit_growth!=null?`<div style="font-size:11px;color:${d.fundamentals.profit_growth>0?"#059669":"#dc2626"}">${d.fundamentals.profit_growth>0?"+":""}${d.fundamentals.profit_growth}% YoY</div>`:""}</div>
  <div><span class="metric-label">순이익</span><div style="font-weight:600">${d.fundamentals?.net_profit||"-"}</div></div>
</div>

${[d.earnings_forecast?.current_year,d.earnings_forecast?.next_year].filter(Boolean).length ? `<h2>🔮 실적 전망</h2><div class="grid grid2">${[d.earnings_forecast?.current_year,d.earnings_forecast?.next_year].filter(Boolean).map(yr=>`<div class="card"><strong>${yr.year}</strong><div class="grid grid2" style="margin-top:8px"><div><span class="metric-label">매출</span><div>${yr.revenue||"-"}</div></div><div><span class="metric-label">영업이익</span><div>${yr.op_profit||"-"}</div></div><div><span class="metric-label">순이익</span><div>${yr.net_profit||"-"}</div></div><div><span class="metric-label">EPS/PER</span><div>${yr.eps?.toLocaleString()||"-"} / ${yr.per||"-"}x</div></div></div></div>`).join("")}</div>`:""}

${d.consensus?.reports?.length ? `<h2>📑 증권사 리포트</h2>${d.consensus.reports.map(r=>`<div class="report-row"><span class="broker">${r.broker}</span><span class="badge">${r.rating}</span><span class="tp">TP ${r.target?.toLocaleString()}</span><span style="flex:1;color:#666">${r.comment||""}</span><span style="color:#aaa;font-size:11px">${r.date}</span></div>`).join("")}`:""}

<h2>⚡ 스윙 트레이딩 시그널</h2>
<div class="grid grid2">
  <div>
    ${[["단기",d.swing_signal?.short_trend],["중기",d.swing_signal?.medium_trend]].map(([l,t])=>{const cls=t?.includes("상승")?"trend-up":t?.includes("하락")?"trend-down":"trend-side";const arrow=t?.includes("상승")?"▲":t?.includes("하락")?"▼":"►";return `<div style="margin-bottom:6px"><span style="color:#999;font-size:11px;display:inline-block;width:40px">${l}</span><span class="${cls}">${arrow} ${t||"-"}</span></div>`}).join("")}
    <div style="margin-bottom:4px"><span style="color:#999;font-size:11px;display:inline-block;width:40px">지지</span><span style="color:#2563eb;font-weight:600">${d.swing_signal?.support||"-"}</span></div>
    <div style="margin-bottom:4px"><span style="color:#999;font-size:11px;display:inline-block;width:40px">저항</span><span style="color:#dc2626;font-weight:600">${d.swing_signal?.resistance||"-"}</span></div>
    <div style="margin-bottom:4px"><span style="color:#999;font-size:11px;display:inline-block;width:40px">거래량</span>${d.swing_signal?.volume_trend||"-"}</div>
    <div><span style="color:#999;font-size:11px;display:inline-block;width:40px">수급</span>${d.swing_signal?.supply_demand||"-"}</div>
  </div>
  <div>
    <div style="margin-bottom:8px"><strong style="font-size:11px;color:#999">📌 카탈리스트</strong>${(d.swing_signal?.catalyst||[]).map(c=>`<div style="margin-top:4px">● ${c}</div>`).join("")}</div>
    <div><strong style="font-size:11px;color:#999">⚠️ 리스크</strong>${(d.swing_signal?.risk||[]).map(r=>`<div style="margin-top:4px;color:#dc2626">● ${r}</div>`).join("")}</div>
  </div>
</div>

${d.news_summary?.length ? `<h2>📰 최신 뉴스</h2>${d.news_summary.map(n=>`<div style="margin-bottom:4px">• ${n}</div>`).join("")}`:""}

<div class="footer">⚠ AI가 생성한 정보입니다. 투자 판단 전 반드시 원본 데이터를 확인하세요. | ${new Date().toLocaleDateString("ko-KR")} 생성</div>
</body></html>`;
    return html;
  }

  function downloadPDF(d) {
    const html = exportHTML(d);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${d.company?.name || "분석"}_기업분석_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const d = data;
  const changePct = d?.price?.change_pct;
  const changeColor = changePct > 0 ? "text-red-600" : changePct < 0 ? "text-blue-600" : "text-gray-500";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: "'Pretendard Variable', 'Noto Sans KR', -apple-system, sans-serif" }}>
      <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet" />

      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm print-hide">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-sm">S</div>
            <span className="font-bold text-sm text-gray-700 hidden sm:inline">Stock Analyst (Gemini)</span>
          </div>
          <div className="flex-1 flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="종목명 또는 종목코드 입력 (예: 삼성전자, 005930)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyze()}
            />
            <button
              onClick={analyze}
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
            >
              {loading ? "분석중..." : "분석"}
            </button>
            {d && (
              <button
                onClick={() => downloadPDF(d)}
                className="px-4 py-2.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl transition-all whitespace-nowrap shadow-sm"
              >
                📄 다운로드
              </button>
            )}
            {d && (
              <button
                onClick={() => {
                  setSaving(true);
                  const payload = JSON.stringify(data);
                  sendPrompt(`[DRIVE_SAVE] 아래 분석 결과를 Google Drive에 HTML 파일로 저장해줘.\n종목명: ${data.company?.name}\n종목코드: ${data.company?.code}\nDATA_JSON_START\n${payload}\nDATA_JSON_END`);
                }}
                disabled={saving}
                className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-xl transition-all whitespace-nowrap shadow-sm print-hide disabled:opacity-50"
              >
                {saving ? "저장중..." : "📁 Drive"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {d && (
          <div className="hidden print-title" style={{ display: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 8, borderBottom: "2px solid #111" }}>
              <span style={{ fontSize: 20, fontWeight: 800 }}>📊 {d.company?.name} ({d.company?.code}) 기업분석 리포트</span>
              <span style={{ fontSize: 11, color: "#888" }}>{new Date().toLocaleDateString("ko-KR")} 생성</span>
            </div>
          </div>
        )}
        {!d && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="text-5xl mb-2">📊</div>
            <h2 className="text-xl font-bold text-gray-800">AI 기업 분석 대시보드 (Gemini Powered)</h2>
            <p className="text-sm text-gray-500 max-w-md">
              종목명이나 코드를 입력하면 실시간 웹 검색을 통해<br />
              기업 기본정보, 재무지표, 증권사 컨센서스, 스윙 시그널을<br />
              종합 대시보드로 보여드립니다.
            </p>
            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              {["삼성전자", "SK하이닉스", "에코프로비엠", "셀트리온", "NAVER"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); }}
                  className="px-3 py-1.5 text-xs bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 transition-all shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && <LoadingPulse text={loadMsg} />}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {d && (
          <div className="space-y-5 animate-[fadeIn_0.6s_ease]">
            {/* Company Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-black tracking-tight text-gray-900">{d.company?.name}</h1>
                  <Badge color="purple">{d.company?.market}</Badge>
                  <span className="text-sm text-gray-400">{d.company?.code}</span>
                </div>
                <p className="text-sm text-gray-500">{d.company?.sector}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {d.company?.theme?.map((t, i) => <Badge key={i} color="blue">{t}</Badge>)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tabular-nums text-gray-900">
                  {d.price?.current?.toLocaleString()}
                  <span className="text-sm text-gray-400 ml-1">원</span>
                </div>
                <div className={`text-lg font-bold ${changeColor}`}>
                  {changePct > 0 ? "+" : ""}{changePct}%
                </div>
              </div>
            </div>

            {/* Description */}
            {d.company?.description && (
              <p className="text-sm text-gray-600 leading-relaxed bg-white rounded-xl px-4 py-3 border border-gray-200 shadow-sm">
                {d.company.description}
              </p>
            )}

            {/* Score + Price Band + Consensus */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card title="종합 평가" icon="🎯">
                <div className="flex flex-col items-center gap-3">
                  <ScoreRing score={d.overall_score?.value || 0} grade={d.overall_score?.grade || "-"} />
                  <p className="text-sm text-gray-600 text-center">{d.overall_score?.comment}</p>
                </div>
              </Card>

              <Card title="가격 밴드" icon="📈">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>52주 최저</span><span>현재가</span><span>52주 최고</span>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    {(() => {
                      const low = d.price?.low_52w || 0;
                      const high = d.price?.high_52w || 1;
                      const cur = d.price?.current || 0;
                      const pct = high > low ? ((cur - low) / (high - low)) * 100 : 50;
                      return (
                        <>
                          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                          <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border-2 border-blue-500" style={{ left: `calc(${pct}% - 8px)` }} />
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between text-sm font-semibold tabular-nums">
                    <span className="text-blue-600">{d.price?.low_52w?.toLocaleString()}</span>
                    <span className="text-gray-900">{d.price?.current?.toLocaleString()}</span>
                    <span className="text-red-600">{d.price?.high_52w?.toLocaleString()}</span>
                  </div>
                  <Metric label="평균 거래량" value={d.price?.volume_avg} />
                </div>
              </Card>

              <Card title="컨센서스" icon="🏦">
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-gray-400 text-xs">목표주가</span>
                    <span className="text-2xl font-black text-amber-600 tabular-nums">
                      {d.consensus?.target_price?.toLocaleString() || "-"}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-gray-400 text-xs">상승여력</span>
                    <span className={`text-lg font-bold ${(d.consensus?.upside_pct || 0) > 0 ? "text-red-600" : "text-blue-600"}`}>
                      {d.consensus?.upside_pct > 0 ? "+" : ""}{d.consensus?.upside_pct || "-"}%
                    </span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <Badge color="green">{d.consensus?.rating || "-"}</Badge>
                    <span className="text-xs text-gray-500">{d.consensus?.analyst_count || 0}명 커버</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Fundamentals */}
            <Card title="핵심 재무지표" icon="📋">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-6 gap-y-4">
                <Metric label="시가총액" value={d.fundamentals?.market_cap} />
                <Metric label="PER" value={d.fundamentals?.per} highlight={d.fundamentals?.per < 15 ? "text-emerald-600" : d.fundamentals?.per > 30 ? "text-red-600" : "text-gray-900"} />
                <Metric label="선행 PER" value={d.fundamentals?.fwd_per} highlight="text-amber-600" />
                <Metric label="PBR" value={d.fundamentals?.pbr} />
                <Metric label="ROE" value={d.fundamentals?.roe != null ? d.fundamentals.roe + "%" : null} highlight={d.fundamentals?.roe > 15 ? "text-emerald-600" : "text-gray-900"} />
                <Metric label="EPS" value={d.fundamentals?.eps?.toLocaleString()} />
                <Metric label="BPS" value={d.fundamentals?.bps?.toLocaleString()} />
                <Metric label="배당수익률" value={d.fundamentals?.div_yield != null ? d.fundamentals.div_yield + "%" : null} />
                <Metric label="부채비율" value={d.fundamentals?.debt_ratio != null ? d.fundamentals.debt_ratio + "%" : null} highlight={d.fundamentals?.debt_ratio > 200 ? "text-red-600" : "text-gray-900"} />
                <Metric label="시총 등급" value={d.fundamentals?.market_cap_rank} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-gray-100">
                <div>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider">매출액</span>
                  <p className="text-sm font-semibold mt-0.5 text-gray-900">{d.fundamentals?.revenue || "-"}</p>
                  {d.fundamentals?.revenue_growth != null && (
                    <span className={`text-xs font-semibold ${d.fundamentals.revenue_growth > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {d.fundamentals.revenue_growth > 0 ? "+" : ""}{d.fundamentals.revenue_growth}% YoY
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider">영업이익</span>
                  <p className="text-sm font-semibold mt-0.5 text-gray-900">{d.fundamentals?.op_profit || "-"}</p>
                  {d.fundamentals?.profit_growth != null && (
                    <span className={`text-xs font-semibold ${d.fundamentals.profit_growth > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {d.fundamentals.profit_growth > 0 ? "+" : ""}{d.fundamentals.profit_growth}% YoY
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider">순이익</span>
                  <p className="text-sm font-semibold mt-0.5 text-gray-900">{d.fundamentals?.net_profit || "-"}</p>
                </div>
              </div>
            </Card>

            {/* Earnings Forecast */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[d.earnings_forecast?.current_year, d.earnings_forecast?.next_year].filter(Boolean).map((yr, i) => (
                <Card key={i} title={`실적 전망 ${yr.year}`} icon={i === 0 ? "🔮" : "🔭"}>
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[11px] text-gray-400">매출</span><p className="text-sm font-semibold text-gray-900">{yr.revenue || "-"}</p></div>
                    <div><span className="text-[11px] text-gray-400">영업이익</span><p className="text-sm font-semibold text-gray-900">{yr.op_profit || "-"}</p></div>
                    <div><span className="text-[11px] text-gray-400">순이익</span><p className="text-sm font-semibold text-gray-900">{yr.net_profit || "-"}</p></div>
                    <div><span className="text-[11px] text-gray-400">예상 EPS / PER</span><p className="text-sm font-semibold tabular-nums text-gray-900">{yr.eps?.toLocaleString() || "-"} / {yr.per || "-"}x</p></div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Broker Reports */}
            {d.consensus?.reports?.length > 0 && (
              <Card title="증권사 리포트" icon="📑">
                <div className="space-y-3">
                  {d.consensus.reports.map((r, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2.5 px-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-sm text-gray-800 whitespace-nowrap">{r.broker}</span>
                        <Badge color={r.rating?.includes("매수") || r.rating?.includes("Buy") ? "green" : r.rating?.includes("중립") || r.rating?.includes("Hold") ? "yellow" : "gray"}>
                          {r.rating}
                        </Badge>
                      </div>
                      <span className="text-sm font-bold text-amber-600 tabular-nums whitespace-nowrap">
                        TP {r.target?.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-600 flex-1 truncate">{r.comment}</span>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{r.date}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Swing Signal */}
            <Card title="스윙 트레이딩 시그널" icon="⚡">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-16">단기</span>
                    <TrendArrow trend={d.swing_signal?.short_trend} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-16">중기</span>
                    <TrendArrow trend={d.swing_signal?.medium_trend} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-16">지지선</span>
                    <span className="text-sm font-semibold text-blue-600">{d.swing_signal?.support}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-16">저항선</span>
                    <span className="text-sm font-semibold text-red-600">{d.swing_signal?.resistance}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-16">거래량</span>
                    <span className="text-sm text-gray-700">{d.swing_signal?.volume_trend}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-16">수급</span>
                    <span className="text-sm text-gray-700">{d.swing_signal?.supply_demand}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs text-gray-400 mb-2">📌 카탈리스트</h4>
                    <div className="space-y-1.5">
                      {d.swing_signal?.catalyst?.map((c, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5 text-xs">●</span>
                          <span className="text-sm text-gray-700">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-400 mb-2">⚠️ 리스크</h4>
                    <div className="space-y-1.5">
                      {d.swing_signal?.risk?.map((r, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5 text-xs">●</span>
                          <span className="text-sm text-gray-700">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* News */}
            {d.news_summary?.length > 0 && (
              <Card title="최신 뉴스" icon="📰">
                <div className="space-y-2">
                  {d.news_summary.map((n, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-gray-300 mt-0.5">•</span>
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <p className="text-[11px] text-gray-400 text-center pb-4">
              ⚠ AI가 구글 실시간 검색을 기반으로 생성한 정보입니다. 투자 판단 전 반드시 원본 데이터를 확인하세요.
            </p>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @media print {
          body, html { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-hide, header { display: none !important; }
          .print-title { display: block !important; }
          .print-title > div { display: flex !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          div[class*="min-h-screen"] { min-height: auto !important; background: white !important; }
          div[class*="rounded-2xl"], div[class*="rounded-xl"] { break-inside: avoid; }
          div[class*="shadow-sm"] { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          svg { max-width: 120px !important; max-height: 120px !important; }
          @page { size: A4; margin: 12mm 10mm; }
        }
      `}</style>
    </div>
  );
}