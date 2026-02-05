const API_URL =
  "https://script.google.com/macros/s/AKfycbxbkOw4wND_WIj1xG1GWZphtY4Btv3x7KGZo14N_lcIp_eoxTnCkABadJ9TV2bcDoh9Vw/exec";

function showMsg(t){
  const el = document.getElementById("msg");
  if(el) el.textContent = "狀態：" + t;
}
function loadJSONP(){
  return new Promise((resolve,reject)=>{
    const cb = "cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    window[cb] = (p) => { delete window[cb]; script.remove(); resolve(p); };

    const script = document.createElement("script");
    // ✅ 同時帶 callback 與 cb 兩種參數名（保險）
    script.src = `${API_URL}?type=get&callback=${cb}&cb=${cb}&_=${Date.now()}`;
    script.onerror = () => reject(new Error("JSONP 載入失敗"));
    document.body.appendChild(script);
  });
}

// 用 Image 觸發 GET（最穩，不怕 CORS/preflight）
function hit(url){
  const img = new Image();
  img.onload = () => showMsg("✅ 已送出（看顯示版是否變）");
  img.onerror = () => showMsg("⚠️ 回應被擋但可能成功（請看顯示版）");
  img.src = url + "&_=" + Date.now();
}

async function refresh(){
  const p = await loadJSONP(API_URL);
  if(!p.ok) throw new Error(p.error || "讀取失敗");
  const state = p.data || {};

  // 亮起日期按鈕
  document.getElementById("d0702").classList.toggle("active", state.date === "2026-02-07");
  document.getElementById("d0802").classList.toggle("active", state.date === "2026-02-08");

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
  // 讓控制板自己也更新一下
  setTimeout(()=>refresh().catch(()=>{}), 400);
};

window.setStatus = function(text){
  showMsg(`送出：status=${text}`);
  hit(`${API_URL}?type=set&key=status&value=${encodeURIComponent(text)}`);
};

window.setDate = function(iso){
  showMsg(`送出：date=${iso}`);
  hit(`${API_URL}?type=set&key=date&value=${encodeURIComponent(iso)}`);
  setTimeout(()=>refresh().catch(()=>{}), 400);
};
// 🔴 新增：日期切換（你原本沒有）
window.setDate = function(iso){
  showMsg(`送出：date=${iso}`);

  // 同時寫入多個可能的 key（保險）
  hit(`${API_URL}?type=set&key=date&value=${encodeURIComponent(iso)}`);
  hit(`${API_URL}?type=set&key=day&value=${encodeURIComponent(iso)}`);
  hit(`${API_URL}?type=set&key=Date&value=${encodeURIComponent(iso)}`);
  hit(`${API_URL}?type=set&key=date%20&value=${encodeURIComponent(iso)}`);

  setTimeout(()=>refresh().catch(()=>{}), 500);
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
