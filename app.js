/* Glaral app */
(function(){
"use strict";
const P = window.GlaralPanchang;
const GF = window.GlaralFestivals;
const CITIES = window.GLARAL_CITIES;
const CFG = window.GLARAL_CONFIG || {};

/* ---------- state ---------- */
const store = {
  get(k, d){ try{ const v = localStorage.getItem('glaral_'+k); return v==null?d:JSON.parse(v);}catch(e){return d;} },
  set(k, v){ try{ localStorage.setItem('glaral_'+k, JSON.stringify(v)); }catch(e){} }
};
let city = store.get('city', null) || { name:"New Delhi", lat:28.6139, lng:77.2090, tz:"Asia/Kolkata" };
let pro = !!store.get('pro', false);
let amanta = store.get('amanta', true);
let tab = 'today';
let selDate = todayInTz(city.tz);       // {y,m,d}
let calCursor = { y: selDate.y, m: selDate.m };

const festCache = {};
function festivals(year){
  if(!festCache[year]) festCache[year] = GF.festivalsForYear(year, {lat:city.lat,lng:city.lng,tz:city.tz});
  return festCache[year];
}

/* ---------- helpers ---------- */
function todayInTz(tz){
  const f = new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'numeric',day:'numeric'});
  const [y,m,d] = f.format(new Date()).split('-').map(Number);
  return {y,m,d};
}
function fmtD(d){ return d.y+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0'); }
function addDays(d,n){ const dt=new Date(d.y,d.m-1,d.d+n); return {y:dt.getFullYear(),m:dt.getMonth()+1,d:dt.getDate()}; }
function sameDay(a,b){ return a.y===b.y&&a.m===b.m&&a.d===b.d; }
function monthName(m){ return ["January","February","March","April","May","June","July","August","September","October","November","December"][m-1]; }
function weekdayName(y,m,d){ return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date(y,m-1,d).getDay()]; }
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* license key: GLRL-XXXX-XXXX-XXXX, last block carries a checksum */
function keyOk(k){
  k = String(k||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!/^GLRL[0-9A-Z]{12}$/.test(k)) return false;
  const body = k.slice(4,14), chk = k.slice(14);
  let h = 0; const salt = 'glaral-pro-v1';
  const s = body + salt;
  for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) >>> 0; }
  const expect = h.toString(36).toUpperCase().padStart(7,'0').slice(-2);
  return chk === expect;
}

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); tab = t.dataset.tab;
    ['today','calendar','festivals'].forEach(v=>document.getElementById('view-'+v).style.display = v===tab?'':'none');
    if(tab==='calendar') renderCalendar();
    if(tab==='festivals') renderFestivals();
    if(tab==='today') renderToday();
  });
});

/* ---------- TODAY ---------- */
function nextFestivals(fromDate, n){
  const out = [];
  for(let y=fromDate.y; y<=fromDate.y+1 && out.length<n+10; y++){
    const list = festivals(y).major.slice().sort((a,b)=>(a.m-b.m)||(a.d-b.d));
    for(const f of list){
      const n1 = f.y*10000+f.m*100+f.d, n0 = fromDate.y*10000+fromDate.m*100+fromDate.d;
      if(n1 >= n0) out.push(f);
      if(out.length >= n+10) break;
    }
  }
  // dedupe by id+date, keep order
  const seen = new Set(), res = [];
  for(const f of out){ const k = f.id+f.y+f.m+f.d; if(!seen.has(k)){ seen.add(k); res.push(f); } }
  return res.slice(0, n);
}
function renderToday(){
  const el = document.getElementById('view-today');
  const p = P.panchangForDate(selDate, {lat:city.lat,lng:city.lng,tz:city.tz});
  const monthStr = amanta ? p.monthAmanta : p.monthPurnimanta;
  const isToday = sameDay(selDate, todayInTz(city.tz));
  const fests = festivals(selDate.y).major.filter(f=>f.y===selDate.y&&f.m===selDate.m&&f.d===selDate.d);
  const now = todayInTz(city.tz);
  const upcoming = isToday ? nextFestivals(now, 7) : [];
  const nextF = upcoming.find(f=>!(f.y===now.y&&f.m===now.m&&f.d===now.d));

  let heroFest = '';
  if(fests.length){
    heroFest = '<div class="hero-fest">'+fests.map(f=>'🪔 '+esc(f.name)).join(' · ')+'</div>';
  }
  let countdown = '';
  if(nextF){
    const inDays = Math.round((new Date(nextF.y,nextF.m-1,nextF.d)-new Date(now.y,now.m-1,now.d))/864e5);
    countdown =
    '<div class="card countdown"><div class="cd-label">Next festival</div>'+
    '<div class="cd-name">🪔 '+esc(nextF.name)+'</div>'+
    '<div class="cd-when">'+esc(weekdayName(nextF.y,nextF.m,nextF.d))+', '+monthName(nextF.m)+' '+nextF.d+
    ' · <b>'+(inDays===0?'today!':inDays===1?'tomorrow':'in '+inDays+' days')+'</b></div>'+
    (nextF.blurb?'<div class="cd-blurb">'+esc(nextF.blurb)+'</div>':'')+'</div>';
  }
  let strip = '';
  if(upcoming.length){
    strip = '<div class="card"><h3 style="margin:0 0 10px;font-size:15px">Upcoming festivals</h3><div class="strip">'+
      upcoming.map(f=>{
        const inDays = Math.round((new Date(f.y,f.m-1,f.d)-new Date(now.y,now.m-1,now.d))/864e5);
        return '<div class="chip"><div class="chip-d">'+f.d+'</div><div class="chip-m">'+monthName(f.m).slice(0,3)+'</div>'+
          '<div class="chip-n">'+esc(f.name)+'</div><div class="chip-w">'+(inDays===0?'today':inDays+'d')+'</div></div>';
      }).join('')+'</div></div>';
  }

  el.innerHTML =
  '<div class="hero"><div class="today-head">'+
    '<div class="eng">'+esc(weekdayName(selDate.y,selDate.m,selDate.d))+', '+monthName(selDate.m)+' '+selDate.d+', '+selDate.y+'</div>'+
    '<div class="tithi">'+esc(p.tithiName)+'</div>'+
    '<div class="sub">'+esc(p.paksha)+' Paksha · '+esc(p.nakshatra)+' Nakshatra</div>'+
    '<div class="sub" style="margin-top:4px;opacity:.85">📍 '+esc(city.name)+' · '+esc(monthStr)+' ('+(amanta?'Amanta':'Purnimanta')+')</div>'+
    heroFest+
    '<div style="margin-top:10px;display:flex;gap:8px;justify-content:center">'+
      '<button class="hbtn" id="prevDay">‹ Prev</button>'+
      (isToday?'':'<button class="hbtn" id="goToday">Today</button>')+
      '<button class="hbtn" id="nextDay">Next ›</button>'+
    '</div>'+
    '<div class="toggle"><button class="'+(amanta?'on':'')+'" id="tAm">Amanta</button><button class="'+(!amanta?'on':'')+'" id="tPu">Purnimanta</button></div>'+
  '</div></div>'+
  countdown + strip +

  '<div class="card"><div class="grid2">'+
    kv('Tithi', p.tithiName)+
    kv('Paksha', p.paksha)+
    kv('Nakshatra', p.nakshatra)+
    kv('Yoga', p.yogaName)+
    kv('Karana', p.karanaName)+
    kv('Month', monthStr+'<br><small>'+(amanta?'Amanta':'Purnimanta')+'</small>')+
    kv('Vara', p.vara)+
    kv('Sun sign', (P.RASHI_NAMES||[])[p.sunRashi] || '')+
  '</div></div>'+

  '<div class="card"><h3 style="margin:0 0 6px;font-size:15px">Sun & Moon</h3><div class="times">'+
    tm('Sunrise', p.sunrise)+tm('Sunset', p.sunset)+tm('Moonrise', p.moonrise)+
  '</div></div>'+

  '<div class="card"><h3 style="margin:0 0 6px;font-size:15px">Muhurta</h3>'+
    '<div id="liveNow" style="margin-bottom:6px"></div>'+
    seg('Rahu Kaal', p.rahuKaal)+
    seg('Yamaganda', p.yamaganda)+
    seg('Gulika', p.gulika)+
    seg('Abhijit', p.abhijit)+
  '</div>';

  // live countdown: which muhurta is running now?
  if(isToday){
    const liveEl = document.getElementById('liveNow');
    const periods = [
      ['Rahu Kaal ⛔', p._rahuMs], ['Yamaganda ⛔', p._yamaMs],
      ['Gulika ⛔', p._gulikaMs], ['Abhijit ✅', p._abhijitMs]
    ];
    const tick = ()=>{
      const nowMs = Date.now();
      let html = '';
      for(const [name, ms] of periods){
        if(!ms) continue;
        const [a,b] = ms;
        if(nowMs >= a && nowMs <= b){
          const mins = Math.round((b-nowMs)/60000);
          html = '<div style="background:#fef3c7;border:1px solid #f3d9a8;border-radius:10px;padding:8px 12px;font-size:14px">⏱️ <b>'+name+'</b> running now · ends in '+mins+' min</div>';
          break;
        } else if(nowMs < a){
          const mins = Math.round((a-nowMs)/60000);
          if(mins < 180) html = '<div style="font-size:13px;color:var(--muted);padding:4px 0">⏳ '+name+' starts in '+mins+' min</div>';
        }
      }
      liveEl.innerHTML = html;
    };
    tick();
    setInterval(tick, 60000);
  }

  document.getElementById('prevDay').onclick = ()=>{ selDate = addDays(selDate,-1); renderToday(); };
  document.getElementById('nextDay').onclick = ()=>{ selDate = addDays(selDate,1); renderToday(); };
  const gt = document.getElementById('goToday'); if(gt) gt.onclick = ()=>{ selDate = todayInTz(city.tz); renderToday(); };
  document.getElementById('tAm').onclick = ()=>{ amanta=true; store.set('amanta',true); renderToday(); };
  document.getElementById('tPu').onclick = ()=>{ amanta=false; store.set('amanta',false); renderToday(); };

  function kv(k,v){ return '<div class="kv"><div class="k">'+k+'</div><div class="v">'+v+'</div></div>'; }
  function tm(k,v){ return '<div class="t"><div class="k">'+k+'</div><div class="v">'+(v||'—')+'</div></div>'; }
  function seg(k,v){ return '<div class="seg"><span>'+k+'</span><b>'+(v||'—')+'</b></div>'; }
}

/* ---------- CALENDAR (Pro) ---------- */
function renderCalendar(){
  const el = document.getElementById('view-calendar');
  if(!pro){ el.innerHTML = proLock('Monthly calendar','Browse any month with daily tithis and festival markers.'); return; }
  const {y,m} = calCursor;
  const first = new Date(y, m-1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const fests = festivals(y).major;
  const festByDay = {};
  fests.forEach(f=>{ if(f.m===m) (festByDay[f.d]=festByDay[f.d]||[]).push(f); });

  let cells = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>'<div class="dow">'+d+'</div>').join('');
  const prevDays = new Date(y, m-1, 0).getDate();
  for(let i=first-1;i>=0;i--){
    const d = prevDays-i, pd = addDays({y,m,d:1},-(first-i));
    cells += dayCell(pd, true, festByDay);
  }
  for(let d=1; d<=days; d++) cells += dayCell({y,m,d}, false, festByDay);
  const total = first + days, tail = (7 - total%7)%7;
  for(let d=1; d<=tail; d++){ const nd = addDays({y,m,d:days},d); cells += dayCell(nd, true, festByDay); }

  el.innerHTML =
  '<div class="card"><div class="cal-head">'+
    '<button id="calPrev">‹</button><div class="mtitle">'+monthName(m)+' '+y+'</div><button id="calNext">›</button>'+
  '</div><div class="cal">'+cells+'</div></div>'+
  '<div class="card" id="calDetail"><div style="color:var(--muted);font-size:14px">Tap a day to see its panchang.</div></div>';

  document.getElementById('calPrev').onclick = ()=>{ calCursor = addMonths(calCursor,-1); renderCalendar(); };
  document.getElementById('calNext').onclick = ()=>{ calCursor = addMonths(calCursor,1); renderCalendar(); };
  el.querySelectorAll('.day').forEach(c=>c.addEventListener('click',()=>{
    el.querySelectorAll('.day').forEach(x=>x.classList.remove('sel'));
    c.classList.add('sel');
    showDayDetail(JSON.parse(c.dataset.date));
  }));

  function dayCell(dt, dim){
    const p = P.panchangForDate(dt, {lat:city.lat,lng:city.lng,tz:city.tz});
    const fl = (festByDay[dt.d] && !dim) ? festByDay[dt.d] : [];
    const cls = 'day'+(dim?' dim':'')+(sameDay(dt,todayInTz(city.tz))?' today':'');
    return '<div class="'+cls+'" data-date=\''+JSON.stringify(dt)+'\'>'+
      '<div class="d">'+dt.d+'</div><div class="ti">'+esc(p.tithiName.split(' ')[0])+'</div>'+
      (fl.length?'<div class="dot"></div>':'')+'</div>';
  }
  function showDayDetail(dt){
    const p = P.panchangForDate(dt, {lat:city.lat,lng:city.lng,tz:city.tz});
    const fl = festivals(dt.y).major.filter(f=>f.y===dt.y&&f.m===dt.m&&f.d===dt.d);
    document.getElementById('calDetail').innerHTML =
      '<b>'+weekdayName(dt.y,dt.m,dt.d)+', '+monthName(dt.m)+' '+dt.d+'</b><br>'+
      '<span style="font-size:14px">'+esc(p.tithiName)+' · '+esc(p.paksha)+' · '+esc(p.nakshatra)+'<br>'+
      'Sunrise '+esc(p.sunrise||'—')+' · Sunset '+esc(p.sunset||'—')+'</span>'+
      (fl.length? '<div style="margin-top:6px">'+fl.map(f=>'🪔 <b>'+esc(f.name)+'</b>').join('<br>')+'</div>':'');
  }
}
function addMonths(c,n){ const d=new Date(c.y,c.m-1+n,1); return {y:d.getFullYear(),m:d.getMonth()+1}; }

/* ---------- FESTIVALS (Pro) ---------- */
function renderFestivals(){
  const el = document.getElementById('view-festivals');
  if(!pro){ el.innerHTML = proLock('Festival list','Every major festival for the year, computed for '+esc(city.name)+'.'); return; }
  const y = selDate.y;
  const list = festivals(y).major.slice().sort((a,b)=>(a.m-b.m)||(a.d-b.d));
  const now = todayInTz(city.tz);
  const nowN = now.y*10000+now.m*100+now.d;
  // group by month
  const byMonth = {};
  list.forEach(f=>{ (byMonth[f.m]=byMonth[f.m]||[]).push(f); });
  const months = Object.keys(byMonth).map(Number).sort((a,b)=>a-b);
  el.innerHTML = '<div class="card"><h3 style="margin:0 0 4px">Festivals '+y+' <small style="color:var(--muted);font-weight:500">· '+esc(city.name)+'</small></h3>'+
    '<div class="note" style="text-align:left;margin:0 0 6px">'+list.length+' festivals · computed for your city</div>'+
    '<button class="ghostbtn" id="icsBtn" style="margin-bottom:8px">📅 Add all to my calendar (.ics)</button>'+
    months.map(m=>{
      return '<div class="fmonth">'+monthName(m)+'</div>'+
        byMonth[m].map(f=>{
          const n = f.y*10000+f.m*100+f.d;
          const inDays = Math.round((new Date(f.y,f.m-1,f.d)-new Date(now.y,now.m-1,now.d))/864e5);
          const when = inDays<0?'':(inDays===0?' · <b>today</b>':' · in '+inDays+'d');
          return '<div class="fest-item"><div class="fdate"><div class="fd">'+f.d+'</div><div class="fm">'+monthName(f.m).slice(0,3)+'</div></div>'+
            '<div class="fname">'+esc(f.name)+(f.blurb?'<small>'+esc(f.blurb)+'</small>':'')+'</div>'+
            '<div class="in">'+esc(weekdayName(f.y,f.m,f.d).slice(0,3))+when+'</div></div>';
        }).join('');
    }).join('')+'</div>';
  document.getElementById('icsBtn').onclick = downloadICS;
}
function proLock(title, desc){
  setTimeout(()=>{ const b=document.getElementById('lockPro'); if(b) b.onclick=openPro; },0);
  return '<div class="probanner">🔒 <b>Glaral Pro</b> — '+esc(desc)+
    '<br><button class="probtn" id="lockPro" style="margin-top:10px">Unlock Pro · '+(CFG.PRO_PRICE_LABEL||'$6.99')+'</button></div>';
}

/* ---------- ICS export: add festivals to Google/Apple calendar ---------- */
function downloadICS(){
  const y = selDate.y;
  const list = festivals(y).major.slice().sort((a,b)=>(a.m-b.m)||(a.d-b.d));
  const stamp = new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Glaral//Hindu Calendar//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:Glaral Festivals '+y+'\r\n';
  for(const f of list){
    const dt = f.y+String(f.m).padStart(2,'0')+String(f.d).padStart(2,'0');
    const summary = f.name.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,');
    const desc = (f.blurb||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,');
    ics += 'BEGIN:VEVENT\r\nUID:'+f.id+'-'+dt+'@glaral\r\nDTSTAMP:'+stamp+'\r\nDTSTART;VALUE=DATE:'+dt+'\r\nSUMMARY:🪔 '+summary+'\r\n'+
      (desc?'DESCRIPTION:'+desc+'\r\n':'')+'END:VEVENT\r\n';
  }
  ics += 'END:VCALENDAR\r\n';
  const blob = new Blob([ics], {type:'text/calendar'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'glaral-festivals-'+y+'.ics';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* ---------- city picker ---------- */
const cityModal = document.getElementById('cityModal');
document.getElementById('cityBtn').onclick = ()=>{ cityModal.classList.add('open'); renderCityList(''); };
document.getElementById('cityClose').onclick = ()=>cityModal.classList.remove('open');
document.getElementById('citySearch').addEventListener('input', e=>renderCityList(e.target.value));
function renderCityList(q){
  q = q.trim().toLowerCase();
  const list = CITIES.filter(c=>!q || c[0].toLowerCase().includes(q) || c[1].toLowerCase().includes(q)).slice(0,80);
  document.getElementById('cityList').innerHTML = list.map((c,i)=>
    '<div class="cityrow" data-i="'+CITIES.indexOf(c)+'"><span>'+esc(c[0])+'</span><small>'+esc(c[1])+'</small></div>').join('')
    || '<div style="padding:16px;color:var(--muted)">No matches.</div>';
  document.querySelectorAll('.cityrow').forEach(r=>r.onclick=()=>{
    const c = CITIES[+r.dataset.i];
    setCity({name:c[0], lat:c[2], lng:c[3], tz:c[4]});
    cityModal.classList.remove('open');
  });
}
document.getElementById('gpsBtn').onclick = ()=>{
  if(!navigator.geolocation) return alert('Geolocation not available.');
  navigator.geolocation.getCurrentPosition(pos=>{
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setCity({name:'Current location', lat:+pos.coords.latitude.toFixed(4), lng:+pos.coords.longitude.toFixed(4), tz});
    cityModal.classList.remove('open');
  }, ()=>alert('Could not get your location.'), {timeout:10000});
};
function setCity(c){
  city = c; store.set('city', c);
  Object.keys(festCache).forEach(k=>delete festCache[k]);
  document.getElementById('cityBtn').textContent = '📍 '+c.name;
  selDate = todayInTz(c.tz);
  calCursor = {y:selDate.y, m:selDate.m};
  renderToday(); if(tab==='calendar')renderCalendar(); if(tab==='festivals')renderFestivals();
}

/* ---------- Pro ---------- */
const proModal = document.getElementById('proModal');
function openPro(){ proModal.classList.add('open'); }
document.getElementById('proBtn').onclick = ()=>{ pro? alert('Pro is active on this device. 🎉') : openPro(); };
document.getElementById('proClose').onclick = ()=>proModal.classList.remove('open');
if(CFG.PRO_PRICE_LABEL) document.getElementById('proPrice').innerHTML = esc(CFG.PRO_PRICE_LABEL).replace(' one-time',' <span style="font-size:14px;font-weight:500;color:var(--muted)">one-time</span>');
document.getElementById('buyBtn').onclick = ()=>{
  if(!CFG.DODO_PAYMENT_LINK){ alert('Payments are not configured yet.'); return; }
  window.open(CFG.DODO_PAYMENT_LINK, '_blank');
};
document.getElementById('keyBtn').onclick = async ()=>{
  const k = document.getElementById('keyInput').value;
  // try server verification first, fall back to local checksum
  let ok = false;
  if(CFG.VERIFY_ENDPOINT){
    try{
      const r = await fetch(CFG.VERIFY_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:k})});
      const j = await r.json(); ok = !!j.valid;
    }catch(e){ ok = keyOk(k); }
  } else ok = keyOk(k);
  if(ok){ pro = true; store.set('pro', true); updateProBtn(); proModal.classList.remove('open');
    if(tab!=='today'){ tab==='calendar'?renderCalendar():renderFestivals(); }
    alert('Pro activated! 🎉');
  } else alert('That key did not verify. Check it and try again.');
};
function updateProBtn(){
  const b = document.getElementById('proBtn');
  b.textContent = pro ? 'Pro ✓' : 'Pro';
  b.classList.toggle('unlocked', pro);
}

/* ---------- key generator note for Deep (run in node) ----------
function genKey(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let body='';
  for(let i=0;i<12;i++) body+=chars[Math.floor(Math.random()*chars.length)];
  let h=0; const s=body+'glaral-pro-v1';
  for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  const chk=h.toString(36).toUpperCase().padStart(7,'0').slice(-2);
  return 'GLRL-'+body.slice(0,4)+'-'+body.slice(4,8)+'-'+body.slice(8,12)+chk.slice(0,0)+
         body.slice(0,0)+'';
}
// simpler: node -e "const b=[...Array(12)].map(()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');let h=0;const s=b+'glaral-pro-v1';for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;const chk=h.toString(36).toUpperCase().padStart(7,'0').slice(-2);console.log('GLRL-'+b.slice(0,4)+'-'+b.slice(4,8)+'-'+b.slice(8,10)+chk)"
----------------------------------------------------------------- */

/* ---------- init ---------- */
document.getElementById('cityBtn').textContent = '📍 '+city.name;
updateProBtn();
renderToday();
})();
