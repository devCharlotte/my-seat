import { BUS_ROUTES, KTX_ROUTES, ALL_KTX_STATIONS, findKtxCandidates } from '../data/routes.js';
import { analyzeTrip, parseKstDateTime, formatKstTime } from './recommendation.js';
import { cardinalDirection } from './sun.js';

const $ = (s) => document.querySelector(s);
const els = {
  tabs: [...document.querySelectorAll('[data-mode]')],
  busFields: $('#bus-fields'), ktxFields: $('#ktx-fields'),
  busRoute: $('#bus-route'), busFrom: $('#bus-from'), busTo: $('#bus-to'),
  ktxFrom: $('#ktx-from'), ktxTo: $('#ktx-to'), ktxLineWrap: $('#ktx-line-wrap'), ktxLine: $('#ktx-line'),
  date: $('#trip-date'), time: $('#trip-time'), form: $('#trip-form'), error: $('#form-error'),
  result: $('#result'), empty: $('#result-empty')
};

let mode = 'bus';

function option(value, text) { const o=document.createElement('option'); o.value=value; o.textContent=text; return o; }
function fillSelect(select, values, placeholder) {
  select.innerHTML=''; select.append(option('', placeholder)); values.forEach(v=>select.append(option(v.value ?? v, v.label ?? v)));
}

function initDefaults() {
  const nowKst = new Date(Date.now() + 9 * 3600000);
  els.date.value = `${nowKst.getUTCFullYear()}-${String(nowKst.getUTCMonth()+1).padStart(2,'0')}-${String(nowKst.getUTCDate()).padStart(2,'0')}`;
  els.time.value = `${String(nowKst.getUTCHours()).padStart(2,'0')}:${String(nowKst.getUTCMinutes()).padStart(2,'0')}`;

  fillSelect(els.busRoute, [...BUS_ROUTES].sort((a,b)=>Number(a.number)-Number(b.number)).map(r=>({value:r.id,label:`${r.number} · ${r.subtitle}`})), '간선버스 선택');
  els.busRoute.value='bus-160'; updateBusStops();
  fillSelect(els.ktxFrom, ALL_KTX_STATIONS, '탑승역');
  fillSelect(els.ktxTo, ALL_KTX_STATIONS, '도착역');
  els.ktxFrom.value='서울'; els.ktxTo.value='부산'; updateKtxLines();
}

function updateBusStops() {
  const route=BUS_ROUTES.find(r=>r.id===els.busRoute.value); if(!route) return;
  fillSelect(els.busFrom, route.stops.map((s,i)=>({value:String(i),label:s.name})), '탑승 정류장');
  fillSelect(els.busTo, route.stops.map((s,i)=>({value:String(i),label:s.name})), '도착 정류장');
  if(route.id==='bus-160') { els.busFrom.value='4'; els.busTo.value='16'; }
  else { els.busFrom.value='0'; els.busTo.value=String(route.stops.length-1); }
}

function updateKtxLines() {
  const f=els.ktxFrom.value,t=els.ktxTo.value;
  const candidates=f&&t?findKtxCandidates(f,t):[];
  els.ktxLine.innerHTML='';
  candidates.forEach(r=>els.ktxLine.append(option(r.id,r.name)));
  els.ktxLineWrap.hidden=candidates.length<=1;
  if(candidates[0]) els.ktxLine.value=candidates[0].id;
}

function setMode(next) {
  mode=next;
  els.tabs.forEach(b=>{const on=b.dataset.mode===mode;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
  els.busFields.hidden=mode!=='bus'; els.ktxFields.hidden=mode!=='ktx';
  els.result.hidden=true; els.empty.hidden=false; els.error.textContent='';
}

function sideText(x){return x==='left'?'왼쪽':x==='right'?'오른쪽':'양쪽 비슷';}
function confidenceText(x){return x==='high'?'차이가 큼':x==='medium'?'차이가 뚜렷함':x==='low'?'차이가 작음':'야간';}
function fmtMin(m){const n=Math.round(m); return n>=60?`${Math.floor(n/60)}시간 ${n%60}분`:`${n}분`;}
function pct(n){return `${Math.round(n)}%`;}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function render(result) {
  const rec=result.recommendation;
  const isNight=result.daylightMinutes<1;
  const title=isNight?'직사광 걱정이 거의 없습니다':`${sideText(rec)} 좌석 추천`;
  const desc=isNight?'해가 지평선 아래에 있는 구간입니다.':'차량 진행방향을 바라볼 때 기준입니다.';
  const line=result.route.mode==='bus'?`${result.route.number}번 간선버스`:result.route.name;
  const segRows=result.segments.map(s=>`<tr><td>${esc(s.from)} → ${esc(s.to)}</td><td>${s.startTime}–${s.endTime}</td><td>${s.sunElevation<=0?'해 없음':`${s.sunCardinal} · ${Math.round(s.sunElevation)}°`}</td><td><strong>${esc(s.recommendation)}</strong></td></tr>`).join('');

  els.result.innerHTML=`
    <div class="result-head">
      <div><div class="eyebrow">${esc(line)}</div><h2>${esc(title)}</h2><p>${esc(desc)}</p></div>
      <div class="seat-badge ${rec}">${isNight?'☾':rec==='left'?'←':rec==='right'?'→':'↔'}<span>${isNight?'야간':sideText(rec)}</span></div>
    </div>
    <div class="trip-summary"><strong>${esc(result.from.name)}</strong><span>→</span><strong>${esc(result.to.name)}</strong><span class="muted">${formatKstTime(result.departure)} → ${formatKstTime(result.arrival)} · 약 ${fmtMin(result.totalMinutes)}</span></div>
    <div class="score-grid">
      <div class="score-card"><div class="score-label">왼쪽 예상 직사광</div><div class="score-value">${pct(result.leftPct)}</div><div class="bar"><i style="width:${Math.min(100,result.leftPct)}%"></i></div></div>
      <div class="score-card"><div class="score-label">오른쪽 예상 직사광</div><div class="score-value">${pct(result.rightPct)}</div><div class="bar"><i style="width:${Math.min(100,result.rightPct)}%"></i></div></div>
    </div>
    <div class="facts">
      <div><span>탑승 시 태양</span><strong>${result.departSun.elevation>0?`${cardinalDirection(result.departSun.azimuth)} · 고도 ${Math.round(result.departSun.elevation)}°`:'지평선 아래'}</strong></div>
      <div><span>도착 시 태양</span><strong>${result.arrivalSun.elevation>0?`${cardinalDirection(result.arrivalSun.azimuth)} · 고도 ${Math.round(result.arrivalSun.elevation)}°`:'지평선 아래'}</strong></div>
      <div><span>추천 신뢰도</span><strong>${confidenceText(result.confidence)}</strong></div>
    </div>
    <details><summary>구간별 결과 보기</summary><div class="table-wrap"><table><thead><tr><th>구간</th><th>예상 시각</th><th>태양</th><th>덜 받는 쪽</th></tr></thead><tbody>${segRows}</tbody></table></div></details>
    <p class="note">맑은 날 직사광 기준입니다. 건물·터널·방음벽·커튼·구름과 실제 교통 지연은 반영하지 않습니다. 좌/우는 열차나 버스의 <b>진행방향 기준</b>입니다.</p>`;
  els.empty.hidden=true; els.result.hidden=false;
}

els.tabs.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
els.busRoute.addEventListener('change',updateBusStops);
els.ktxFrom.addEventListener('change',updateKtxLines); els.ktxTo.addEventListener('change',updateKtxLines);

els.form.addEventListener('submit',e=>{
  e.preventDefault(); els.error.textContent='';
  const departure=parseKstDateTime(els.date.value,els.time.value);
  if(!departure){els.error.textContent='날짜와 시간을 확인해 주세요.';return;}
  try {
    let route,fromIndex,toIndex;
    if(mode==='bus') {
      route=BUS_ROUTES.find(r=>r.id===els.busRoute.value);
      fromIndex=Number(els.busFrom.value); toIndex=Number(els.busTo.value);
      if(!route||els.busFrom.value===''||els.busTo.value==='') throw new Error('버스와 탑승/도착 정류장을 선택해 주세요.');
    } else {
      const candidates=findKtxCandidates(els.ktxFrom.value,els.ktxTo.value);
      if(!candidates.length) throw new Error('현재 지원 데이터에서 두 역을 직접 잇는 KTX 계통을 찾지 못했습니다.');
      route=KTX_ROUTES.find(r=>r.id===(els.ktxLine.value||candidates[0].id)) || candidates[0];
      fromIndex=route.stops.findIndex(s=>s.name===els.ktxFrom.value); toIndex=route.stops.findIndex(s=>s.name===els.ktxTo.value);
    }
    if(fromIndex===toIndex) throw new Error('탑승지와 도착지는 서로 달라야 합니다.');
    render(analyzeTrip(route,fromIndex,toIndex,departure));
  } catch(err){els.error.textContent=err.message||'계산 중 오류가 발생했습니다.';}
});

initDefaults(); setMode('bus');
