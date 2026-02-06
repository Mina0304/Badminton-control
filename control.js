const API_URL =
  "https://script.google.com/macros/s/AKfycbxbkOw4wND_WIj1xG1GWZphtY4Btv3x7KGZo14N_lcIp_eoxTnCkABadJ9TV2bcDoh9Vw/exec";

function showMsg(t){
  const el = document.getElementById("msg");
  if(el) el.textContent = "狀態：" + t;
}

/* ✅ 日期正規化：避免 Z/時區造成顯示少一天 */
function normalizeDate(v){
  if(!v) return "";
  let s = String(v).trim();

  // 2026-02-07T...Z -> 2026-02-07
  if(s.includes("T")) s = s.slice(0,10);

  // 2026/2/7 -> 2026-2-7
  s = s.replace(/\//g,"-");

  // 2-7 -> 2026-02-07
  if(/^\d{1,2}-\d{1,2}$/.test(s)){
    const [m,d]=s.split("-").map(x=>x.padStart(2,"0"));
    return `2026-${m}-${d}`;
  }

  // 2026-2-7 -> 2026-02-07
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;

  return s;
}

/* ✅ JSONP 讀取（不怕 CORS） */
function loadJSONP(){
  return new Promise((resolve,reject)=>{
    const cb = "cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");

    window[cb] = (p) => {
      delete window[cb];
      script.remove();
      resolve(p);
    };

    // 你的後端是用 callback 參數（固定用 callback 就好）
    script.src = `${API_URL}?callback=${cb}&_=${Date.now()}`;
    script.onerror = () => reject(new Error("JSONP 載入失敗"));
    document.body.appendChild(script);
  });
}

/* ✅ 用 Image 觸發 GET（最穩，不怕 CORS/preflight） */
function hit(url){
  const img = new Image();
  img.onload = () => showMsg("✅ 已送出（看顯示版是否變）");
  img.onerror = () => showMsg("⚠️ 回應被擋但可能成功（請看顯示版）");
  img.src = url + "&_=" + Date.now();
}

async function refresh(){
  const p = await loadJSONP();
  if(!p.ok) throw new Error(p.error || "讀取失敗");
  const state = p.data || {};

  // ✅ 修正：日期用 normalizeDate 比對，且是 2/7、2/8（不是 2/6、2/7）
  const dateIso = normalizeDate(state.date || state.day || state.Date);
  document.getElementById("d0702").classList.toggle("active", dateIso === "2026-02-06");
  document.getElementById("d0802").classList.toggle("active", dateIso === "2026-02-07");

  // 6 場地卡片顯示目前 idx
  const host = document.getElementById("courts");
  host.innerHTML = "";
  for(let c=1;c<=6;c++){
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

window.stepCourt = function(courtKey, delta, idx){
  const nextVal = Math.max(0, idx + delta);
  showMsg(`送出：${courtKey} → ${nextVal}`);
  hit(`${API_URL}?type=set&key=${encodeURIComponent(courtKey)}&value=${encodeURIComponent(nextVal)}`);
  setTimeout(()=>refresh().catch(()=>{}), 450);
};

window.setStatus = function(text){
  showMsg(`送出：status=${text}`);
  hit(`${API_URL}?type=set&key=status&value=${encodeURIComponent(text)}`);
  setTimeout(()=>refresh().catch(()=>{}), 450);
};

/* ✅ 只保留一個 setDate（不要重複定義） */
window.setDate = function(iso){
  showMsg(`送出：date=${iso}`);

  // 你的新後端應該允許 date 直接寫
  hit(`${API_URL}?type=set&key=date&value=${encodeURIComponent(iso)}`);

  // 如果你後端同時用 day/Date，也一起寫（保險）
  hit(`${API_URL}?type=set&key=day&value=${encodeURIComponent(iso)}`);
  hit(`${API_URL}?type=set&key=Date&value=${encodeURIComponent(iso)}`);

  setTimeout(()=>refresh().catch(()=>{}), 550);
};

(async function init(){
  showMsg("讀取中…");
  try{
    await refresh();
    showMsg("就緒（可切日期/切場次）");
  }catch(e){
    showMsg("❌ " + e.message);
  }
})();
