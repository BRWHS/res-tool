import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

/* ===== SUPABASE (deine echten Werte eintragen) ===== */
const SUPABASE_URL = "https://kytuiodojfcaggkvizto.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/* ===== Helpers ===== */
const $  = q => document.querySelector(q)
const $$ = q => document.querySelectorAll(q)
const toast = $('#toast')
function showToast(msg, ms=2400){ toast.textContent = msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), ms) }
const fmtISO = d => new Date(d).toISOString().slice(0,10)
const datesFrom = (start, n)=> Array.from({length:n}, (_,i)=>{ const x=new Date(start); x.setDate(x.getDate()+i); return x })

/* ===== Hotels ===== */
const HOTELS = [
  "MASEVEN München Dornach","MASEVEN München Trudering","MASEVEN Frankfurt","MASEVEN Stuttgart",
  "Fidelity Robenstein","Fidelity Struck","Fidelity Doerr","Fidelity Gr. Baum","Fidelity Landskron",
  "Fidelity Pürgl","Fidelity Seppl","Tante Alma Bonn","Tante Alma Köln","Tante Alma Erfurt",
  "Tante Alma Mannheim","Tante Alma Mülheim","Tante Alma Sonnen","Delta by Marriot Offenbach","Villa Viva Hamburg"
]

/* ===== Clock ===== */
function tick(){
  const now=new Date()
  const dateStr = now.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})
  const timeStr = now.toLocaleTimeString('de-DE',{hour12:false})
  $('#date').textContent = dateStr; $('#clock').textContent = timeStr
  $('#date2').textContent = dateStr; $('#clock2').textContent = timeStr
}
setInterval(tick, 1000); tick()

/* ===== Overlay & Modals ===== */
const overlay = $('#overlay')
function openModal(name){
  overlay.hidden=false
  document.getElementById(`modal-${name}`).setAttribute('aria-hidden','false')
  const onEsc = e=>{ if(e.key==='Escape') closeAll() }
  document.addEventListener('keydown', onEsc, { once:true })
  overlay.onclick = closeAll
}
function closeAll(){
  overlay.hidden=true
  $$('.modal[aria-hidden="false"]').forEach(m=> m.setAttribute('aria-hidden','true'))
}
$$('[data-open]').forEach(b=> b.addEventListener('click', e=> openModal(e.currentTarget.dataset.open)))
$$('[data-close]').forEach(b=> b.addEventListener('click', closeAll))

/* ===== KPIs ===== */
async function refreshKpis(){
  const now = new Date()
  const todayISO = fmtISO(now)
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate()-6)
  const weekISO = fmtISO(weekStart)

  try{
    const { count: todayCount } = await supabase
      .from('reservations').select('id',{count:'exact',head:true})
      .gte('created_at', todayISO)
    $('#kpi-today').textContent = todayCount ?? 0
  }catch{ $('#kpi-today').textContent = '—' }

  try{
    const { count: weekCount } = await supabase
      .from('reservations').select('id',{count:'exact',head:true})
      .gte('created_at', weekISO)
    $('#kpi-week').textContent = weekCount ?? 0
  }catch{ $('#kpi-week').textContent = '—' }

  // Demo-Werte bis echte Quelle steht:
  const adr = 105 + Math.floor(Math.random()*14)
  const occ = 60 + Math.floor(Math.random()*20)
  $('#kpi-adr').textContent = adr + ' €'
  $('#kpi-occ').textContent = occ + '%'
}
refreshKpis(); setInterval(refreshKpis, 30000)

/* ===== Mini Availability – 3 Level inkl. Überbuchung ===== */
let miniWeekOffset = 0
$('#mini-prev')?.addEventListener('click', ()=>{ miniWeekOffset -= 7; renderMiniAvailability() })
$('#mini-next')?.addEventListener('click', ()=>{ miniWeekOffset += 7; renderMiniAvailability() })

function levelForPct(pct){
  if (pct >= 100) return 'over'   // Überbuchung
  if (pct >= 80)  return 'tight'  // angespannt
  return 'normal'                 // normal
}

function renderMiniAvailability(){
  const base = new Date(); base.setDate(base.getDate()+miniWeekOffset)
  const days = datesFrom(base,7).map(fmtISO)
  const rows = HOTELS.slice(0,8).map(h=>{
    const total = 180 + (h.length % 140)
    const cells = days.map((d,i)=>{
      const overBoost = (i%6===0)? 1.10 : 1.0 // gelegentlich leicht über 100%
      const booked = Math.floor(Math.min(total*1.2, total * (0.45 + 0.55*Math.abs(Math.sin(i/1.7 + h.length/11))) * overBoost))
      const pct = Math.round(booked/total*100)
      const lvl = levelForPct(pct)
      return { d, booked, total, pct, lvl }
    })
    return { h, cells }
  })
  const table = `
    <table>
      <thead><tr><th>Hotel</th>${days.map(d=>`<th>${d}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r=>`
        <tr>
          <td>${r.h}</td>
          ${r.cells.map(c=>`<td><span class="mini-cell mini-lvl-${c.lvl}">${c.booked}/${c.total} <small>(${c.pct}%)</small></span></td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table>`
  $('#mini-availability').innerHTML = table
}
renderMiniAvailability()

/* ===== New Reservation – Wizard ===== */
const dummyRates = [
  { id:'FLEX_EX', name:'Flex exklusive Frühstück', price:89 },
  { id:'FLEX_IN', name:'Flex inklusive Frühstück', price:109 },
]
const state = { hotel:null, arrival:null, departure:null, rate:null, guest:{ first_name:'', last_name:'', email:'' } }
function setStep(n){ $('#stepper-thumb').style.width = (n*33) + '%' }
function validDates(a,d){ if(!a||!d) return false; const A=new Date(a), D=new Date(d); return !isNaN(A)&&!isNaN(D)&&D>A }

function step1(){
  setStep(1)
  $('#newResContent').innerHTML = `
    <div class="card alt">
      <div class="grid cols-3">
        <label>Hotel
          <select id="nrHotel"><option value="">Bitte wählen…</option>${HOTELS.map(h=>`<option ${state.hotel===h?'selected':''}>${h}</option>`).join('')}</select>
        </label>
        <label>Anreise <input type="date" id="nrArr" value="${state.arrival||''}"></label>
        <label>Abreise <input type="date" id="nrDep" value="${state.departure||''}"></label>
      </div>
      <div class="toolbar"><button class="primary" id="to2" disabled>Weiter</button></div>
    </div>`
  const ready = ()=> $('#to2').disabled = !(state.hotel && validDates(state.arrival,state.departure))
  $('#nrHotel').onchange = e=>{ state.hotel=e.target.value; ready() }
  $('#nrArr').onchange   = e=>{ state.arrival=e.target.value; ready() }
  $('#nrDep').onchange   = e=>{ state.departure=e.target.value; ready() }
  $('#to2').onclick = step2
}
function step2(){
  setStep(2)
  $('#newResContent').innerHTML = `
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">
      ${dummyRates.map(r=>`
        <div class="card">
          <div class="kachel">
            <div><strong>${r.name}</strong><br><span class="muted">Demo‑Rate</span></div>
            <div><strong>${r.price} €</strong><br><button class="primary pick" data-rate="${r.id}" style="margin-top:6px">Wählen</button></div>
          </div>
        </div>`).join('')}
    </div>
    <div class="toolbar"><button id="back1">Zurück</button><button class="primary" id="to3" disabled>Weiter</button></div>`
  $$('.pick').forEach(b=> b.onclick = e=>{ state.rate=e.currentTarget.dataset.rate; $('#to3').disabled=false })
  $('#back1').onclick = step1
  $('#to3').onclick = step3
}
function step3(){
  setStep(3)
  const rate = dummyRates.find(r=>r.id===state.rate)
  $('#newResContent').innerHTML = `
    <div class="card">
      <div class="grid cols-3">
        <label>Vorname <input id="nrFn" value="${state.guest.first_name||''}"></label>
        <label>Nachname <input id="nrLn" value="${state.guest.last_name||''}"></label>
        <label>E‑Mail <input id="nrEm" value="${state.guest.email||''}" type="email"></label>
      </div>
      <hr style="border:0;border-top:1px dashed #22304a;margin:12px 0">
      <div class="grid" style="grid-template-columns:2fr 1fr">
        <div>
          <div><strong>Hotel:</strong> ${state.hotel||'-'}</div>
          <div><strong>Zeitraum:</strong> ${state.arrival||'?'} → ${state.departure||'?'}</div>
          <div><strong>Rate:</strong> ${rate? `${rate.name} (${rate.price} €)`:'-'}</div>
        </div>
        <div style="align-self:end;justify-self:end">
          <button class="primary" id="submit" disabled>Reservierung abschicken</button>
        </div>
      </div>
    </div>
    <div class="toolbar"><button id="back2">Zurück</button></div>`
  $('#nrFn').oninput = e=> state.guest.first_name = e.target.value
  $('#nrLn').oninput = e=>{ state.guest.last_name  = e.target.value; $('#submit').disabled = !state.guest.last_name }
  $('#nrEm').oninput = e=> state.guest.email       = e.target.value
  $('#back2').onclick = step2
  $('#submit').onclick = submitReservation
}
function openNewRes(){ openModal('newRes'); step1() }

/* ===== Supabase Insert ===== */
async function submitReservation(){
  const btn = $('#submit'); btn.disabled = true; btn.textContent = 'Speichere…'
  const payload = {
    hotel_id: state.hotel, arrival: state.arrival, departure: state.departure,
    category_id: null, rate_code: state.rate,
    guest_first_name: state.guest.first_name, guest_last_name: state.guest.last_name, guest_email: state.guest.email,
    created_at: new Date().toISOString()
  }
  try{
    const { data, error } = await supabase.from('reservations').insert(payload).select().single()
    if(error) throw error
    showToast('Gespeichert – ID '+data.id)
    closeAll(); openReservations()
  }catch(e){ console.error(e); showToast('Fehler: '+e.message, 4000) }
  finally{ btn.disabled=false; btn.textContent='Reservierung abschicken' }
}

/* ===== Reservations – modern table ===== */
let resPage=1, resPageSize=25, resQuery='', sortKey='created_at', sortDir='desc'
function openReservations(){ openModal('reservations'); mountReservations() }
function mountReservations(){
  $('#resSearch').value = resQuery
  $('#resSearch').oninput = e=>{ resQuery=e.target.value.trim(); resPage=1; renderReservations() }
  $('#resPrev').onclick = ()=>{ if(resPage>1){resPage--; renderReservations()} }
  $('#resNext').onclick = ()=>{ resPage++; renderReservations() }
  $$('#resTable thead th[data-sort]').forEach(th=>{
    th.onclick = ()=>{ sortKey = th.dataset.sort; sortDir = (sortDir==='asc'?'desc':'asc'); renderReservations() }
  })
  renderReservations()
}
async function fetchReservations(){
  const from=(resPage-1)*resPageSize, to=from+resPageSize-1
  const { count } = await supabase.from('reservations').select('id',{count:'exact',head:true})
  let q = supabase.from('reservations').select('id,hotel_id,arrival,departure,guest_last_name,guest_first_name,guest_email,rate_code,created_at')
  if(resQuery) q = q.ilike('guest_last_name', `%${resQuery}%`)
  q = q.order(sortKey, { ascending: (sortDir==='asc') }).range(from,to)
  const { data, error } = await q
  if(error) throw error
  return { rows:data||[], count:count||0 }
}
function renderReservationsRow(r){
  return `<tr>
    <td>${(r.guest_last_name||'-')} ${(r.guest_first_name||'')}</td>
    <td>${r.arrival||'-'}</td>
    <td>${r.departure||'-'}</td>
    <td>${r.hotel_id||'-'}</td>
    <td>${r.rate_code||'-'}</td>
    <td><span class="pill tight">Ändern</span> <span class="pill over">Stornieren</span></td>
  </tr>`
}
async function renderReservations(){
  const tbody = $('#resTbody'); tbody.innerHTML = `<tr><td colspan="6">Lade…</td></tr>`
  try{
    const { rows, count } = await fetchReservations()
    tbody.innerHTML = rows.map(renderReservationsRow).join('')
    const pages = Math.max(1, Math.ceil(count/resPageSize))
    $('#resPageinfo').textContent = `Seite ${resPage} von ${pages} (${count})`
    $('#resPrev').disabled = resPage<=1
    $('#resNext').disabled = resPage>=pages
  }catch(e){
    console.error(e); tbody.innerHTML = `<tr><td colspan="6">Fehler: ${e.message}</td></tr>`
  }
}

/* ===== Availability – 3 Level + Überbuchung ===== */
function openAvailability(){ openModal('availability'); mountAvailability() }
function mountAvailability(){
  const today = new Date()
  $('#availStart').value = fmtISO(today)
  $('#availGenerate').onclick = renderAvailabilityMatrix
  renderAvailabilityMatrix()
}
function levelForPct(p){ return (p>=100)?'over' : (p>=80)?'tight' : 'normal' }

function renderAvailabilityMatrix(){
  const start = new Date($('#availStart').value || new Date())
  const days  = Math.max(1, Math.min(31, parseInt($('#availDays').value||'14',10)))
  const dates = Array.from({length:days}, (_,i)=>{ const d=new Date(start); d.setDate(d.getDate()+i); return fmtISO(d) })

  const totals = {
    "MASEVEN München Dornach":319,"MASEVEN München Trudering":289,"MASEVEN Frankfurt":220,"MASEVEN Stuttgart":180,
    "Fidelity Robenstein":140,"Fidelity Struck":110,"Fidelity Doerr":95,"Fidelity Gr. Baum":160,"Fidelity Landskron":120,
    "Fidelity Pürgl":80,"Fidelity Seppl":100,"Tante Alma Bonn":130,"Tante Alma Köln":120,"Tante Alma Erfurt":115,
    "Tante Alma Mannheim":140,"Tante Alma Mülheim":110,"Tante Alma Sonnen":90,"Delta by Marriot Offenbach":200,"Villa Viva Hamburg":180
  }

  const rows = HOTELS.map(h=>{
    const total = totals[h]||100
    const cells = dates.map((d,i)=>{
      const overBoost = (i%7===0)? 1.12 : 1.0
      const booked = Math.floor(Math.min(total*1.25, total * (0.35 + 0.55*Math.abs(Math.sin(i/2 + h.length/9))) * overBoost))
      const pct = Math.round(booked/total*100)
      const lvl = levelForPct(pct)
      return { d, booked, total, pct, lvl }
    })
    return { h, cells }
  })

  const thead = `<thead><tr><th>Hotel</th>${dates.map(d=>`<th>${d}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${rows.map(r=>`
    <tr>
      <td>${r.h}</td>
      ${r.cells.map(c=>`<td class="lvl-${c.lvl}">
        ${c.booked} / ${c.total} <span class="pct">(${c.pct}%)</span>${c.pct>=100?'<span class="overmark">OVER</span>':''}
      </td>`).join('')}
    </tr>`).join('')}</tbody>`
  $('#availMatrix').innerHTML = `<table class="matrix-table">${thead}${tbody}</table>`

  // Hover highlight row
  const mat = $('#availMatrix')
  mat.onmousemove = e=>{
    const cell = e.target.closest('td,th'); if(!cell) return
    const row = cell.parentElement
    $$('#availMatrix tr').forEach(tr=> tr.classList.remove('hover'))
    row.classList.add('hover')
  }
}

/* ===== Bind tiles ===== */
$$('.tile[data-open="newRes"]').forEach(el=> el.onclick = openNewRes)
$$('.tile[data-open="reservations"]').forEach(el=> el.onclick = openReservations)
$$('.tile[data-open="availability"]').forEach(el=> el.onclick = openAvailability)
