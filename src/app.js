import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// === SUPABASE (ersetzen) ===
const SUPABASE_URL = "https://kytuiodojfcaggkvizto.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ==== Hotels (aus deiner Liste) ====
const HOTELS = [
  "MASEVEN München Dornach","MASEVEN München Trudering","MASEVEN Frankfurt","MASEVEN Stuttgart",
  "Fidelity Robenstein","Fidelity Struck","Fidelity Doerr","Fidelity Gr. Baum",
  "Fidelity Landskron","Fidelity Pürgl","Fidelity Seppl",
  "Tante Alma Bonn","Tante Alma Köln","Tante Alma Erfurt","Tante Alma Mannheim","Tante Alma Mülheim","Tante Alma Sonnen",
  "Delta by Marriot Offenbach","Villa Viva Hamburg"
]

// ===== Helpers =====
const $  = (q)=>document.querySelector(q)
const $$ = (q)=>document.querySelectorAll(q)
const toast = $('#toast')

function showToast(msg, ms=2500){ toast.textContent=msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), ms) }
function fmtDate(d){ return new Date(d).toISOString().slice(0,10) }
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)) }

// ===== Overlay & Modals (immer schließbar) =====
const overlay = $('#overlay')
function openModal(name){
  overlay.hidden = false
  const el = document.getElementById(`modal-${name}`)
  el.setAttribute('aria-hidden','false')
  // Esc zum Schließen
  const esc = (e)=>{ if(e.key==='Escape') closeAll() }
  document.addEventListener('keydown', esc, { once: true })
  // Click außerhalb schließt
  overlay.onclick = closeAll
}
function closeAll(){
  overlay.hidden = true
  $$('.modal[aria-hidden="false"]').forEach(m=>m.setAttribute('aria-hidden','true'))
}
$$('[data-open]').forEach(b=> b.addEventListener('click', e=> openModal(e.currentTarget.dataset.open)))
$$('[data-close]').forEach(b=> b.addEventListener('click', closeAll))

// ===== STATE =====
const state = {
  hotel:null, arrival:null, departure:null,
  rate:null,
  guest:{ first_name:'', last_name:'', email:'' }
}
const persist = ()=>localStorage.setItem('res-tool', JSON.stringify(state))
const load = ()=>{ try{ Object.assign(state, JSON.parse(localStorage.getItem('res-tool')||'{}')) }catch{} }
load()

/* ===================== Neue Reservierung (Wizard) ===================== */
const dummyRates = [
  { id:'FLEX_EX', name:'Flex exklusive Frühstück', price:89 },
  { id:'FLEX_IN', name:'Flex inklusive Frühstück', price:109 },
]
function validDates(a, d){ if(!a||!d) return false; const A=new Date(a), D=new Date(d); return !isNaN(A)&&!isNaN(D)&&D>A }

function renderNewReservation(){
  const root = $('#newResContent')
  root.innerHTML = `
    <div class="grid cols-3">
      <label>Hotel
        <select id="nrHotel">
          <option value="">Bitte wählen…</option>
          ${HOTELS.map(h=>`<option ${state.hotel===h?'selected':''}>${h}</option>`).join('')}
        </select>
      </label>
      <label>Anreise <input type="date" id="nrArr" value="${state.arrival||''}"></label>
      <label>Abreise <input type="date" id="nrDep" value="${state.departure||''}"></label>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="grid" style="grid-template-columns:1fr 1fr; gap:12px">
        ${dummyRates.map(r=>`
          <div class="kachel">
            <div><strong>${r.name}</strong><br><span class="muted">Test</span></div>
            <div><strong>${r.price} €</strong><br><button class="primary chooseRate" data-rate="${r.id}" style="margin-top:6px">Wählen</button></div>
          </div>
        `).join('')}
      </div>
    </div>
    <hr>
    <div class="grid cols-3">
      <label>Vorname <input id="nrFn" value="${state.guest.first_name||''}" autocomplete="given-name"></label>
      <label>Nachname <input id="nrLn" value="${state.guest.last_name||''}" autocomplete="family-name"></label>
      <label>E-Mail <input id="nrEm" value="${state.guest.email||''}" type="email" autocomplete="email"></label>
    </div>
    <div class="toolbar"><button class="primary" id="nrSubmit" disabled>Reservierung abschicken</button></div>
  `
  $('#nrHotel').onchange  = (e)=>{ state.hotel=e.target.value; persist(); update() }
  $('#nrArr').onchange    = (e)=>{ state.arrival=e.target.value; persist(); update() }
  $('#nrDep').onchange    = (e)=>{ state.departure=e.target.value; persist(); update() }
  $('#nrFn').oninput      = (e)=>{ state.guest.first_name=e.target.value; persist(); update() }
  $('#nrLn').oninput      = (e)=>{ state.guest.last_name=e.target.value; persist(); update() }
  $('#nrEm').oninput      = (e)=>{ state.guest.email=e.target.value; persist(); update() }
  $$('.chooseRate').forEach(b=> b.onclick = (e)=>{ state.rate=e.currentTarget.dataset.rate; persist(); showToast('Rate gesetzt') ; update() })
  $('#nrSubmit').onclick  = submitReservation

  function update(){
    const ready = state.hotel && validDates(state.arrival,state.departure) && state.rate && state.guest.last_name
    $('#nrSubmit').disabled = !ready
  }
  update()
}
function openNewRes(){ openModal('newRes'); renderNewReservation() }

/* ===================== Supabase Insert ===================== */
async function submitReservation(){
  const btn = $('#nrSubmit'); btn.disabled=true; btn.textContent='Wird gespeichert…'
  const payload = {
    hotel_id: state.hotel,
    arrival: state.arrival,
    departure: state.departure,
    category_id: null,
    rate_code: state.rate,
    guest_first_name: state.guest.first_name,
    guest_last_name: state.guest.last_name,
    guest_email: state.guest.email,
    created_at: new Date().toISOString()
  }
  try{
    const { data, error } = await supabase.from('reservations').insert(payload).select().single()
    if(error) throw error
    showToast('Reservierung gespeichert – ID '+data.id)
    state.rate=null; persist()
    closeAll()
    openReservations() // direkt zur Liste
  }catch(e){
    console.error(e); showToast('Fehler: '+e.message, 4000)
  }finally{
    btn.textContent='Reservierung abschicken'; btn.disabled=false
  }
}

/* ===================== Reservierungen (Liste) ===================== */
let resPage=1, resPageSize=50, resQuery=''
function openReservations(){ openModal('reservations'); mountReservations() }
function mountReservations(){
  $('#resSearch').value = resQuery
  $('#resSearch').oninput = (e)=>{ resQuery=e.target.value.trim(); resPage=1; renderReservations() }
  $('#resPrev').onclick = ()=>{ if(resPage>1){resPage--; renderReservations()} }
  $('#resNext').onclick = ()=>{ resPage++; renderReservations() }
  renderReservations()
}
async function fetchReservations(){
  const from=(resPage-1)*resPageSize, to=from+resPageSize-1
  const { count } = await supabase.from('reservations').select('*',{count:'exact',head:true})
  let q = supabase.from('reservations').select('id,hotel_id,arrival,departure,guest_last_name,guest_first_name,guest_email,rate_code,created_at')
    .order('created_at',{ascending:false}).range(from,to)
  if(resQuery) q = q.ilike('guest_last_name', `%${resQuery}%`)
  const { data, error } = await q
  if(error) throw error
  return { rows:data||[], count:count||0 }
}
function renderReservationRows(rows){
  return rows.map(r=>`
    <details class="row">
      <summary class="grid head" style="grid-template-columns:1.4fr 1fr 1fr 1fr 1fr">
        <div>${(r.guest_last_name||'-')} ${(r.guest_first_name||'')}</div>
        <div>${r.arrival||'-'}</div>
        <div>${r.departure||'-'}</div>
        <div>${r.hotel_id||'-'}</div>
        <div>${r.rate_code||'-'}</div>
      </summary>
      <div class="card">
        <div><strong>Email:</strong> ${r.guest_email||'-'}</div>
        <div><strong>Erstellt:</strong> ${new Date(r.created_at).toLocaleString()}</div>
        <div class="toolbar" style="margin-top:8px">
          <button disabled>Ändern (später)</button>
          <button disabled>Stornieren (später)</button>
        </div>
      </div>
    </details>`).join('')
}
async function renderReservations(){
  const host = $('#resList'); host.innerHTML = `<div class="card">Lade…</div>`
  try{
    const { rows, count } = await fetchReservations()
    host.innerHTML = `
      <div class="grid head" style="grid-template-columns:1.4fr 1fr 1fr 1fr 1fr">
        <div>Gastname</div><div>Anreise</div><div>Abreise</div><div>Hotel</div><div>Rate</div>
      </div>
      ${renderReservationRows(rows)}`
    const totalPages = Math.max(1, Math.ceil(count/resPageSize))
    $('#resPageinfo').textContent = `Seite ${resPage} von ${totalPages} (${count} Einträge)`
    $('#resPrev').disabled = resPage<=1
    $('#resNext').disabled = resPage>=totalPages
  }catch(e){
    console.error(e); host.innerHTML = `<div class="card">Fehler: ${e.message}</div>`
  }
}

/* ===================== Verfügbarkeit (Matrix) ===================== */
/* Bis echte Datenquelle steht: Demo-Generator. Später:
   - table availability(hotel text, date date, booked int, total int)
   - Select pivot/matrix im Client bauen (oder View).
*/
function openAvailability(){ openModal('availability'); mountAvailability() }
function mountAvailability(){
  const today = new Date()
  $('#availStart').value = fmtDate(today)
  $('#availDays').value = 14
  $('#availGenerate').onclick = renderAvailabilityMatrix
  renderAvailabilityMatrix()
}
function renderAvailabilityMatrix(){
  const start = new Date($('#availStart').value || new Date())
  const days = clamp(parseInt($('#availDays').value||'14',10),1,31)

  // Demo-Daten je Hotel/Tag
  const totalMap = {
    "MASEVEN München Dornach":319,"MASEVEN München Trudering":289,"MASEVEN Frankfurt":220,"MASEVEN Stuttgart":180,
    "Fidelity Robenstein":140,"Fidelity Struck":110,"Fidelity Doerr":95,"Fidelity Gr. Baum":160,
    "Fidelity Landskron":120,"Fidelity Pürgl":80,"Fidelity Seppl":100,
    "Tante Alma Bonn":130,"Tante Alma Köln":120,"Tante Alma Erfurt":115,"Tante Alma Mannheim":140,"Tante Alma Mülheim":110,"Tante Alma Sonnen":90,
    "Delta by Marriot Offenbach":200,"Villa Viva Hamburg":180
  }

  const dates = Array.from({length:days}, (_,i)=>{ const d=new Date(start); d.setDate(d.getDate()+i); return fmtDate(d) })
  const rows = HOTELS.map(h=>{
    const total = totalMap[h] || 100
    const cells = dates.map((d,i)=>{
      // Pseudo-Auslastung
      const booked = Math.min(total, Math.max(0, Math.floor(total*(0.35 + 0.4*Math.abs(Math.sin(i/2 + h.length/7))))))
      const pct = Math.round(booked/total*100)
      const cls = pct<60?'ok': pct<85?'warn':'bad'
      return { d, booked, total, pct, cls }
    })
    return { hotel:h, cells }
  })

  // Render Matrix (sticky Header/erste Spalte, Scrollbar)
  const thead = `<thead><tr><th>Hotel</th>${dates.map(d=>`<th>${d}</th>`).join('')}</tr></thead>`
  const tbody = `<tbody>${
    rows.map(r=>`<tr>
      <td>${r.hotel}</td>
      ${r.cells.map(c=>`<td>${c.booked} / ${c.total} <span class="pct ${c.cls}">(${c.pct}%)</span></td>`).join('')}
    </tr>`).join('')
  }</tbody>`

  $('#availMatrix').innerHTML = `<div class="matrix"><table>${thead}${tbody}</table></div>`
}

/* ===================== Schnellkacheln binden ===================== */
$$('.tile[data-open="newRes"]').forEach(el=> el.onclick = openNewRes)
$$('.tile[data-open="reservations"]').forEach(el=> el.onclick = openReservations)
$$('.tile[data-open="availability"]').forEach(el=> el.onclick = openAvailability)
