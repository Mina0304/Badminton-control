const API_URL =
  "https://script.google.com/macros/s/AKfycbxbkOw4wND_WIj1xG1GWZphtY4Btv3x7KGZo14N_lcIp_eoxTnCkABadJ9TV2bcDoh9Vw/exec";

function showMsg(t){
  document.getElementById("msg").textContent = "狀態：" + t;
}

// 用 Image 觸發 GET（最穩，不怕 CORS）
function hit(url){
  const img = new Image();
  img.onload = () => showMsg("✅ 已送出");
  img.onerror = () => showMsg("⚠️ 已送出（回應被擋，但通常成功）");
  img.src = url + "&_=" + Date.now();
}

function setStatus(text){
  hit(`${API_URL}?type=set&key=status&value=${encodeURIComponent(text)}`);
}

function setDate(iso){
  hit(`${API_URL}?type=set&key=date&value=${encodeURIComponent(iso)}`);
}

async function refresh(){
  const cb = "cb_" + Date.now();
  window[cb] = (p) => {
    delete window[cb];
    render(p.data || {});
  };
  const s = document.createElement("script");
  s.src = `${API_URL}?callback=${cb}&_=${Date.now()}`;
  document.body.appendChild(s);
}

function render(state){
  const host = document.getElementById("courts");
  host.innerHTML = "";

  for(let c=1;c<=6;c++){
    const key = "court"+c;
    const idx = Number(state[key] ?? 0);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="head">
        <b>Court ${c}</b>
        <span>目前：${idx}</span>
      </div>
      <div class="row">
        <button onclick="step('${key}',-1)">⬅ 上一場</button>
        <button onclick="step('${key}',1)">下一場 ➜</button>
      </div>
    `;
    host.appendChild(card);
  }
}

function step(key,delta){
  hit(`${API_URL}?type=step&court=${key}&delta=${delta}`);
  setTimeout(refresh,500);
}

refresh();
setInterval(refresh,3000);
