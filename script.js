const OPENWEATHER_API_KEY = "YOUR_OPENWEATHER_API_KEY";
const DEFAULT_SCENERY = { time: "afternoon", weather: "clear" };

const MESSAGES = [
  "Drink water, okay? Stay healthy for me.",
  "I miss you a little more right now.",
  "You’re doing great, even if you don’t feel it.",
  "Take a deep breath. I’m proud of you.",
  "Rest your eyes for a minute, you deserve it.",
  "You make ordinary moments feel special.",
  "I’m cheering for you from here.",
  "Let me be your calm today.",
  "Your effort matters, even unseen.",
  "Please remember to eat something nourishing.",
  "You’re more loved than you know.",
  "Thank you for being you.",
  "I hope you feel held by this moment.",
  "One step at a time. I’m with you.",
  "You shine quietly and beautifully."
];

function getHourLocalOrPH(){
  try{ return new Date().getHours(); }catch(e){}
  const s = new Date().toLocaleString('en-US',{ hour:'numeric', hour12:false, timeZone:'Asia/Manila' });
  const h = parseInt(s,10);
  if(!isNaN(h)) return h;
  const utcH = new Date().getUTCHours();
  return (utcH+8)%24;
}

function formatCurrentTime(){ try{ return new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }catch(e){} try{ return new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', timeZone:'Asia/Manila'}); }catch(e2){} const utc = new Date(); const m = utc.getUTCMinutes(); const h = (utc.getUTCHours()+8)%24; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }

const els = {
  message: document.getElementById("message"),
  another: document.getElementById("another"),
  location: document.getElementById("location"),
  weather: document.getElementById("weather"),
  time: document.getElementById("timeofday"),
  notice: document.getElementById("notice"),
  clouds: document.getElementById("clouds"),
  canvas: document.getElementById("weatherCanvas"),
  sky: document.getElementById("skyCanvas"),
  cloudImgs: document.getElementById("cloudImgs"),
  landImage: document.getElementById("landImage"),
  overlay: document.getElementById("permissionOverlay"),
  allowLocation: document.getElementById("allowLocation"),
};

let rainAnim = null;
let nightAnim = null;
let dayAnim = null;
let lastAuto = { time: DEFAULT_SCENERY.time, weather: DEFAULT_SCENERY.weather, place: "Your area", tempC: null };

function pickMessage(){
  const r = Math.floor(Math.random()*MESSAGES.length);
  els.message.textContent = MESSAGES[r];
}

function getTimeOfDay(){
  const h = getHourLocalOrPH();
  if(h>=5 && h<=7) return "sunrise";
  if(h>=11 && h<=13) return "noon";
  if(h>=14 && h<=16) return "afternoon";
  if(h>=17 && h<=19) return "sunset";
  return "night";
}

function mapWeather(main,time){
  const m = (main||"").toLowerCase();
  if(["rain","drizzle","thunderstorm"].some(x=>m.includes(x))) return "rainy";
  if(m.includes("cloud")) return "cloudy";
  if(m.includes("clear")) return time==="night"?"clear":"sunny";
  if(m.includes("snow")) return "cloudy";
  return "clear";
}

function setScene(time,weather){
  const b = document.body;
  b.className = `time-${time} weather-${weather}`;
  els.time.textContent = `Time: ${formatCurrentTime()}`;
  updateEffects(time,weather);
}
function setSceneAuto(time,weather){ setScene(time,weather); }

function updateEffects(time,weather){
  if(weather!=="rainy"){ stopRain(); } else { startRain(); }
  if(weather==="cloudy"||weather==="rainy"){ showCloudImages(weather); } else { clearCloudImages(); }
  if(time==="night"){ startNightSky(); stopDaySky(); } else { startDaySky(time); dayAnim.weather = weather; stopNightSky(); }
}

function startRain(){
  if(!rainAnim) rainAnim = new RainAnimation(els.canvas);
  rainAnim.start();
}
function stopRain(){ if(rainAnim) rainAnim.stop(); }

function showClouds(){
  if(els.clouds.childElementCount>0) return;
  const count = 6;
  for(let i=0;i<count;i++){
    const c = document.createElement("div");
    c.className = "cloud";
    c.style.width = `${140 + Math.random()*240}px`;
    c.style.height = `${60 + Math.random()*80}px`;
    c.style.top = `${2+Math.random()*28}%`;
    c.style.left = `${-30 - Math.random()*50}vw`;
    const dur = 45 + Math.random()*35;
    c.style.animationDuration = `${dur}s`;
    c.style.animationDelay = `${Math.random()*-dur}s`;
    els.clouds.appendChild(c);
  }
}
function clearClouds(){ els.clouds.innerHTML = ""; }

function showCloudImages(weather){
  if(els.cloudImgs.childElementCount>0) return;
  const imgs = ["image/cloud_1.png","image/cloud_2.png"];
  const count = 8;
  for(let i=0;i<count;i++){
    const img = document.createElement("img");
    img.src = imgs[i%imgs.length];
    img.alt = "cloud";
    img.className = `cloud-img${weather==="rainy"?" rainy":""}`;
    const w = 220 + Math.random()*280;
    img.style.width = `${w}px`;
    img.style.height = `auto`;
    img.style.top = `${2+Math.random()*28}%`;
    img.style.left = `${-30 - Math.random()*50}vw`;
    const dur = 50 + Math.random()*40;
    img.style.animation = `cloudDrift ${dur}s linear infinite`;
    img.style.animationDelay = `${Math.random()*-dur}s`;
    els.cloudImgs.appendChild(img);
  }
}
function clearCloudImages(){ els.cloudImgs.innerHTML = ""; }

function startNightSky(){ if(!nightAnim) nightAnim = new NightSkyAnimation(els.sky); nightAnim.start(); }
function stopNightSky(){ if(nightAnim) nightAnim.stop(); }
function startDaySky(time){ if(!dayAnim) dayAnim = new DaySkyAnimation(els.sky); dayAnim.time = time; dayAnim.start(); }
function stopDaySky(){ if(dayAnim) dayAnim.stop(); }

class RainAnimation{
  constructor(canvas){ this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.drops = []; this.running = false; this.raf = null; resizeCanvas(); this.init(); window.addEventListener("resize",()=>{ resizeCanvas(); }); }
  init(){ const w = this.canvas.width, h = this.canvas.height; const n = Math.floor(w*0.25); this.drops = Array.from({length:n},()=>({ x: Math.random()*w, y: Math.random()*h, l: 8+Math.random()*18, s: 500+Math.random()*900, w: 1+Math.random()*1.2 })); }
  start(){ if(this.running) return; this.running = true; const step = (ts)=>{ if(!this.running){ cancelAnimationFrame(this.raf); return; } this.update(1/60); this.render(); this.raf = requestAnimationFrame(step); }; this.raf = requestAnimationFrame(step); }
  stop(){ this.running=false; this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height); }
  update(dt){ const w = this.canvas.width, h = this.canvas.height; for(const d of this.drops){ d.y += d.s*dt; d.x += 120*dt; if(d.y>h+20){ d.y = -10; d.x = Math.random()*w*0.8; } } }
  render(){ const ctx = this.ctx; const w = this.canvas.width, h = this.canvas.height; ctx.clearRect(0,0,w,h); ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1; ctx.globalAlpha = .65; for(const d of this.drops){ ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-d.l*0.35,d.y-d.l); ctx.stroke(); } ctx.globalAlpha = 1; }
}

class NightSkyAnimation{
  constructor(canvas){ this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.running=false; this.raf=null; this.stars=[]; this.shoots=[]; resizeCanvasEl(this.canvas); this.init(); window.addEventListener("resize",()=>{ resizeCanvasEl(this.canvas); this.reset(); }); }
  init(){ const w=window.innerWidth, h=window.innerHeight; const layers=[0.6,1,1.6]; this.stars=[]; for(let i=0;i<layers.length;i++){ const count = Math.floor((w*h/40000)*(i+1)); for(let j=0;j<count;j++){ this.stars.push({ x: Math.random()*w, y: Math.random()*h*0.9, r: layers[i]*(Math.random()*0.9+0.3), baseA: 0.25+Math.random()*0.6, phase: Math.random()*Math.PI*2, speedX: (i+1)*0.02*(Math.random()*1-0.5), speedY: (i+1)*0.01*(Math.random()*1-0.5)}); } } }
  reset(){ this.init(); }
  start(){ if(this.running) return; this.running=true; const step=()=>{ if(!this.running){ cancelAnimationFrame(this.raf); return; } this.update(1/60); this.render(); this.raf=requestAnimationFrame(step); }; this.raf=requestAnimationFrame(step); }
  stop(){ this.running=false; this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height); this.stars=[]; this.shoots=[]; }
  spawnShoot(){ const w=window.innerWidth, h=window.innerHeight; const dir = Math.random()<0.5?-1:1; const x = dir<0? w*Math.random()*0.3+ w*0.5 : w*Math.random()*0.5; const y = h*(0.1+Math.random()*0.5); const len = 140+Math.random()*220; const speed = 600+Math.random()*900; this.shoots.push({ x, y, vx: dir*speed, vy: speed*-0.35, life: 1, len }); }
  update(dt){ if(Math.random()<0.01 && this.shoots.length<2) this.spawnShoot(); const w=this.canvas.width, h=this.canvas.height; for(const s of this.stars){ s.phase += dt*(0.6+Math.random()*0.8); s.x += s.speedX; s.y += s.speedY; if(s.x<0) s.x=w; if(s.x>w) s.x=0; if(s.y<0) s.y=h*0.9; if(s.y>h*0.9) s.y=0; }
    for(const sh of this.shoots){ sh.x += sh.vx*dt; sh.y += sh.vy*dt; sh.life -= dt*0.4; }
    this.shoots = this.shoots.filter(s=>s.life>0 && s.x>-200 && s.x<this.canvas.width+200 && s.y>-200 && s.y<this.canvas.height+200); }
  moonPos(){ const w=window.innerWidth, h=window.innerHeight; return { x:w*0.78, y:h*0.18, r: Math.min(w,h)*0.08 }; }
  render(){ const ctx=this.ctx; const w=window.innerWidth, h=window.innerHeight; ctx.clearRect(0,0,w,h);
    const mp = this.moonPos(); const g=ctx.createRadialGradient(mp.x,mp.y,mp.r*0.25,mp.x,mp.y,mp.r*1.15); g.addColorStop(0,"rgba(255,255,230,.9)"); g.addColorStop(1,"rgba(255,255,230,0)"); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(mp.x,mp.y,mp.r*1.15,0,Math.PI*2); ctx.fill(); ctx.fillStyle="rgba(245,245,255,.95)"; ctx.beginPath(); ctx.arc(mp.x,mp.y,mp.r*0.74,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=.12; for(let i=0;i<6;i++){ const cr = (Math.random()*0.08+0.04)*mp.r; const cx = mp.x + (Math.random()*0.6-0.3)*mp.r; const cy = mp.y + (Math.random()*0.6-0.3)*mp.r; ctx.beginPath(); ctx.arc(cx,cy,cr,0,Math.PI*2); ctx.fill(); } ctx.globalAlpha=1;
    for(const s of this.stars){ const a = s.baseA*(0.6+0.4*Math.sin(s.phase)); if(s.x>w||s.y>h) continue; ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); }
    ctx.strokeStyle="rgba(255,255,255,.85)"; ctx.lineWidth=1.2; for(const sh of this.shoots){ ctx.globalAlpha = sh.life; ctx.beginPath(); ctx.moveTo(sh.x,sh.y); ctx.lineTo(sh.x-sh.len*0.6, sh.y-sh.len*0.4); ctx.stroke(); ctx.globalAlpha=1; }
  }
}

class DaySkyAnimation{
  constructor(canvas){ this.canvas=canvas; this.ctx=canvas.getContext("2d"); this.running=false; this.raf=null; this.t=0; this.time="afternoon"; resizeCanvasEl(this.canvas); window.addEventListener("resize",()=>resizeCanvasEl(this.canvas)); }
  start(){ if(this.running) return; this.running=true; const step=()=>{ if(!this.running){ cancelAnimationFrame(this.raf); return; } this.t+=1/60; this.render(); this.raf=requestAnimationFrame(step); }; this.raf=requestAnimationFrame(step); }
  stop(){ this.running=false; this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height); }
  sunPos(){ const w=window.innerWidth, h=window.innerHeight; const m={ sunrise:[0.18,0.35], noon:[0.5,0.15], afternoon:[0.72,0.22], sunset:[0.82,0.38] }; const p=m[this.time]||m.afternoon; return {x:w*p[0], y:h*p[1]}; }
  render(){ const ctx=this.ctx; const w=window.innerWidth, h=window.innerHeight; ctx.clearRect(0,0,w,h);
    const gpos=this.sunPos(); const r=Math.min(w,h)*0.09; const baseA=this.weather==="cloudy"?0.5:this.weather==="rainy"?0.25:0.85; const glow=ctx.createRadialGradient(gpos.x,gpos.y,r*0.3,gpos.x,gpos.y,r*1.4); glow.addColorStop(0,`rgba(255,240,180,${baseA})`); glow.addColorStop(1,"rgba(255,240,180,0)"); ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(gpos.x,gpos.y,r*1.4,0,Math.PI*2); ctx.fill(); if(this.weather!=="rainy"){ ctx.fillStyle="rgba(255,230,120,1)"; ctx.beginPath(); ctx.arc(gpos.x,gpos.y,r,0,Math.PI*2); ctx.fill(); ctx.save(); ctx.translate(gpos.x,gpos.y); ctx.rotate(this.t*0.2); ctx.strokeStyle=`rgba(255,230,120,${baseA})`; ctx.lineWidth=2; for(let i=0;i<12;i++){ ctx.rotate(Math.PI*2/12); ctx.beginPath(); ctx.moveTo(r*1.1,0); ctx.lineTo(r*1.4,0); ctx.stroke(); } ctx.restore(); }
    
  }
}

function resizeCanvas(){ const dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1)); const rect = {w: window.innerWidth, h: window.innerHeight}; els.canvas.width = Math.floor(rect.w*dpr); els.canvas.height = Math.floor(rect.h*dpr); els.canvas.style.width = `${rect.w}px`; els.canvas.style.height = `${rect.h}px`; const ctx = els.canvas.getContext("2d"); ctx.setTransform(dpr,0,0,dpr,0,0); }
function resizeCanvasEl(canvas){ const dpr = Math.max(1, Math.min(2, window.devicePixelRatio||1)); const rect = {w: window.innerWidth, h: window.innerHeight}; canvas.width = Math.floor(rect.w*dpr); canvas.height = Math.floor(rect.h*dpr); canvas.style.width = `${rect.w}px`; canvas.style.height = `${rect.h}px`; const ctx = canvas.getContext("2d"); ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr); }

function hasOpenWeatherKey(){ return !!OPENWEATHER_API_KEY && !OPENWEATHER_API_KEY.includes("YOUR_"); }
function wmoToMain(code){
  const c = Number(code);
  if(c===0) return "Clear";
  if([1,2,3,45,48].includes(c)) return "Clouds";
  if([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(c)) return "Rain";
  if([71,73,75,77,85,86].includes(c)) return "Snow";
  return "Clouds";
}
async function fetchWeatherOpenWeather(lat,lon){
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  try{ const res = await fetch(url); if(!res.ok) throw new Error("bad"); const data = await res.json();
    const place = data.name||"Your area";
    const main = (data.weather&&data.weather[0]&&data.weather[0].main)||"";
    const tempC = Math.round((data.main&&data.main.temp)||0);
    return { place, main, tempC };
  }catch(e){ return null; }
}
async function fetchWeatherOpenMeteo(lat,lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
  try{ const res = await fetch(url); if(!res.ok) throw new Error("bad"); const data = await res.json();
    const place = "Your area";
    const code = data.current&&data.current.weather_code;
    const main = wmoToMain(code);
    const tempC = Math.round((data.current&&data.current.temperature_2m)||0);
    return { place, main, tempC };
  }catch(e){ return null; }
}
async function getWeatherForLatLon(lat,lon){
  if(hasOpenWeatherKey()) return await fetchWeatherOpenWeather(lat,lon);
  return await fetchWeatherOpenMeteo(lat,lon);
}
async function fetchApproxLocationByIP(){
  try{ const res = await fetch("https://ip-api.com/json/"); if(!res.ok) throw new Error("bad"); const d = await res.json();
    return { lat: d.lat, lon: d.lon, place: d.city?`${d.city}`:"Your area" };
  }catch(e){ return null; }
}

async function reverseGeocode(lat,lon){
  try{
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
    if(!res.ok) throw new Error("bad");
    const data = await res.json();
    const a = data.address||{};
    const cityOnly = a.city||a.town||a.village||a.municipality||a.locality||a.county||null;
    return cityOnly;
  }catch(e){ return null; }
}

async function init(){
  pickMessage();
  els.another.addEventListener("click",pickMessage);
  const startClock = ()=>{ const update=()=>{ els.time.textContent = `Time: ${formatCurrentTime()}`; }; update(); setInterval(update,30000); };
  startClock();
  
  const time = getTimeOfDay();
  setSceneAuto(time, DEFAULT_SCENERY.weather);
  els.location.textContent = "Locating...";
  const requestGeo = ()=>navigator.geolocation.getCurrentPosition(async(pos)=>{
    const {latitude:lat, longitude:lon} = pos.coords;
    const wdata = await getWeatherForLatLon(lat,lon);
    if(!wdata){
      els.location.textContent = "Location detected";
      els.weather.textContent = "Weather: default";
      els.notice.hidden = false; els.notice.textContent = "Weather service unavailable. Using default scenery.";
      const t0 = getTimeOfDay(); lastAuto = { time:t0, weather:DEFAULT_SCENERY.weather, place: els.location.textContent, tempC: null }; setSceneAuto(t0, DEFAULT_SCENERY.weather);
      if(els.overlay) els.overlay.setAttribute("hidden","");
      return;
    }
    const t = getTimeOfDay();
    const w = mapWeather(wdata.main,t);
    const rg = await reverseGeocode(lat,lon);
    const placeName = rg || wdata.place || "";
    els.location.textContent = placeName;
    els.weather.textContent = `Weather: ${w} • ${wdata.tempC}°C`;
    lastAuto = { time:t, weather:w, place:placeName, tempC:wdata.tempC };
    setSceneAuto(t,w);
    if(els.overlay) els.overlay.setAttribute("hidden","");
  },(err)=>{ if(els.overlay) els.overlay.removeAttribute("hidden"); },{enableHighAccuracy:false, timeout:10000});
  if("geolocation" in navigator){ requestGeo(); } else { if(els.overlay) els.overlay.removeAttribute("hidden"); }
  if(els.allowLocation){ els.allowLocation.addEventListener("click",()=>{ if("geolocation" in navigator){ requestGeo(); } }); }
}

init();
