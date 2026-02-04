const API_URL =
  "https://script.google.com/macros/s/AKfycbyg_h0KqcPVuojAXTJROQ8Zg6x-mXHsYceYGUbyDzYVhWnwtPWZ72L0jtuuhMXcG_2mcg/exec";

function showMsg(t) {
  const el = document.getElementById("msg");
  if (el) el.textContent = "狀態：" + t;
}

/** ✅ 把後端回來的日期統一變成 YYYY-MM-DD
 *  - 支援：2026-02-07T15:00:00.000Z
 *  - 支援：2026/2/7
 *  - 支援：2-7（會補 2026）
 */
function normalizeDate(v) {
  if (!v) return "";
  let s = String(v).trim();

  // 2026-02-07T...Z -> 2026-02-07
  if (s.includes("T")) s = s.split("T")[0];

  // 2026/2/7 -> 2026-2-7
  s = s.replace(/\//g, "-");

  // 2-7 -> 2026-02-07
  if (/^\d{1,2}-\d{1,2}$/.test(s)) {
    const [m, d] = s.split("-").map((x) => x.padStart(2, "0"));
    return `2026-${m}-${d}`;
  }

  // 2026-2-7 -> 2026-02-07
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  return s; // 不認得就原樣回傳（至少不炸）
}

// JSONP 讀取（不怕 CORS）
function loadJSONP(url) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    window[cb] = (payload) => {
      delete window[cb];
      script.remove();
      resolve(payload);
    };
    const script = document.createElement("script");
    script.src = `${url}?callback=${cb}&_=${Date.now()}`;
    script.onerror = () => reject(new Error("JSONP 載入失敗"));
    document.body.appendChild(script);
  });
}

// 用 Image 觸發 GET（最穩，不怕 CORS/preflight）
function hit(url) {
  const img = new Image();
  img.onload = () => showMsg("✅ 已送出（看顯示版是否變）");
  img.onerror = () => showMsg("⚠️ 送出可能成功但回應被擋（看顯示版）");
  img.src = url + "&_=" + Date.now();
}

async function refresh() {
  const p = await loadJSONP(API_URL);
  if (!p.ok) throw new Error(p.error || "讀取失敗");
  const state = p.data || {};

  // ✅ 這裡是重點：用 normalizeDate 來比對
  const dateIso = normalizeDate(state.date || state.day || state.Date);

  // 亮起日期按鈕（修好）
  const b7 = document.getElementById("d0702");
  const b8 = document.getElementById("d0802");
  if (b7) b7.classList.toggle("active", dateIso === "2026-02-07");
  if (b8) b8.classList.toggle("active", dateIso === "2026-02-08");

  // 6 場地卡片顯示目前 idx
  const host = document.getElementById("courts");
  host.innerHTML = "";
  for (let c = 1; c <= 6; c++) {
    const key = `court${c}`;
    const idx = Number(state[key] ?? 0);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="head">
        <div class="name">Court ${c}</div>
        <div class="where">目前：<b>${idx}</b></div>
      </div>
      <div class="row">
        <button onclick="stepCourt('${key}',-1,${idx})">⬅ 上一場</button>
        <button onclick="stepCourt('${key}', 1,${idx})">下一場 ➜</button>
      </div>
    `;
    host.appendChild(card);
  }
}

window.stepCourt = function (courtKey, delta, idx) {
  const nextVal = Math.max(0, idx + delta);
  showMsg(`送出：${courtKey} → ${nextVal}`);
  hit(
    `${API_URL}?type=set&key=${encodeURIComponent(
      courtKey
    )}&value=${encodeURIComponent(nextVal)}`
  );
  setTimeout(() => refresh().catch(() => {}), 400);
};

window.setStatus = function (text) {
  showMsg(`送出：status=${text}`);
  hit(`${API_URL}?type=set&key=status&value=${encodeURIComponent(text)}`);
};

window.setDate = function (iso) {
  // ✅ iso 會是 "2026-02-07" 或 "2026-02-08"
  showMsg(`送出：date=${iso}`);
  hit(`${API_URL}?type=set&key=date&value=${encodeURIComponent(iso)}`);
  setTimeout(() => refresh().catch(() => {}), 400);
};

(async function init() {
  showMsg("讀取中…");
  try {
    await refresh();
    showMsg("就緒（可切日期/切場次）");
  } catch (e) {
    showMsg("❌ " + e.message);
  }
})();
