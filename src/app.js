import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// === SUPABASE (ersetzen) ===
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const $  = (q)=>document.querySelector(q)
const $$ = (q)=>document.querySelectorAll(q)
const toast = $('#toast')

// ===== HOTELS =====
const HOTELS = [
  "MASEVEN München Dornach",
  "MASEVEN München Trudering",
  "MASEVEN Frankfurt",
  "MASEVEN Stuttgart",
  "Fidelity Robenstein",
  "Fidelity Struck",
  "Fidelity Doerr",
  "Fidelity Gr. Baum",
  "Fidelity Landskron",
  "Fidelity Pürgl",
  "Fidelity Seppl",
  "Tante Alma Bonn",
  "Tante Alma Köln",
  "Tante Alma Erfurt",
  "Tante Alma Mannheim",
  "Tante Alma Mülheim",
  "Tante Alma Sonnen",
  "Delta by Marriot Offenbach",
  "Villa Viva Hamburg",
]

// ===== STATE =====
const state = {
  hotel: null, arrival: null, departure: null,
  category: null, rate: null,
  guest: { first_name:'', last_name:'', email:'' },
}
const persist = ()=>localStorage.setItem('res-tool', JSON.stringify(state))
const load = ()=>{ try{ Object.assign(state, JSON.parse(localStorage.getItem('res-tool')||'{}')) }catch{} }
load()

// ===== UI HOOKS =====
function showToast(msg, ms=2400){ toast.textContent=msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), ms) }

function openModal(name){
  document.getElementById(`modal-${name}`).setAttribute('aria-hidden','false')
  if(name==='newRes') renderNewReservation()
  if(name==='reservations') mountReservations()
  if(name==='availability') mountAvailability()
}
function closeModal(el){ el.closest('.modal').setAttribute('aria-hidden','true') }

$$('[data-open]').forEach(b=> b.addEventListener('click', e=> openModal(e.currentTarget.dataset.open)))
$$('[data-close]').forEach(b=> b.addEventListener('click', e=> closeModal(e.currentTarget)))

// ===== NEW RESERVATION =====
const dummyRates = [
  { id:'FLEX_EX', name:'Flex exklusive Frühstück', price:89, desc:'Test rate' },
  { id:'FLEX_IN', name:'Flex inklusive Frühstück', price:109, desc:'Test rate' },
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
            <div>
              <strong>${r.name}</strong><br>
              <span class="muted">${r.desc}</span>
            </div>
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
    <div class="toolbar">
      <button class="primary" id="nrSubmit" disabled>Reservierung abschicken</button>
    </div>
  `
  // bindings
  $('#nrHotel').addEventListener('change', e=>{ state.hotel=e.target.value; persist(); updateSubmitState() })
  $('#nrArr').addEventListener('change', e=>{ state.arrival=e.target.value; persist(); updateSubmitState() })
  $('#nrDep').addEventListener('change', e=>{ state.departure=e.target.value; persist(); updateSubmitState() })
  $('#nrFn').addEventListener('input', e=>{ state.guest.first_name=e.target.value; persist(); updateSubmitState() })
  $('#nrLn').addEventListener('input', e=>{ state.guest.last_name=e.target.value; persist(); updateSubmitState() })
  $('#nrEm').addEventListener('input', e=>{ state.guest.email=e.target.value; persist(); updateSubmitState() })
  $$('.chooseRate').forEach(b=> b.addEventListener('click', e=>{ state.rate=e.currentTarget.dataset.rate; persist(); showToast('Rate gesetzt'); updateSubmitState() }))
  $('#nrSubmit').addEventListener('click', submitReservation)

  function updateSubmitState(){
    const ready = state.hotel && validDates(state.arrival,state.departure) && state.rate && state.guest.last_name
    $('#nrSubmit').disabled = !ready
  }
  updateSubmitState()
}

async function submitReservation(){
  const btn = $('#nrSubmit')
  btn.disabled = true; btn.textContent = 'Wird gespeichert…'
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
    showToast('Reservierung gespeichert – ID ' + data.id)
    // Reset rate, sonst alles gemerkt
    state.rate=null; persist();
    // Optional: Modal schließen
    closeModal($('#modal-newRes').querySelector('[data-close]'))
  }catch(e){
    console.error(e); showToast('Fehler: '+e.message, 4000)
  }finally{
    btn.textContent='Reservierung abschicken'
    btn.disabled=false
  }
}

// ===== RESERVATIONS LIST =====
let resPage=1, resPageSize=50, resQuery=''
function mountReservations(){
  $('#resSearch').value = resQuery
  $('#resSearch').oninput = (e)=>{ resQuery=e.target.value.trim(); resPage=1; renderReservations() }
  $('#resPrev').onclick = ()=>{ if(resPage>1){resPage--; renderReservations()} }
  $('#resNext').onclick = ()=>{ resPage++; renderReservations() }
  renderReservations()
}
async function fetchReservations(){
  const from=(resPage-1)*resPageSize, to=from+resPageSize-1
  const { count } = await supabase.from('reservations').select('*',{count:'exact', head:true})
  let q = supabase.from('reservations')
    .select('id,hotel_id,arrival,departure,guest_last_name,guest_first_name,guest_email,rate_code,created_at')
    .order('created_at',{ascending:false})
    .range(from,to)
  if(resQuery) q = q.ilike('guest_last_name', `%${resQuery}%`)
  const { data, error } = await q
  if(error) throw error
  return { rows: data||[], count: count||0 }
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
    </details>
  `).join('')
}
async function renderReservations(){
  const list = $('#resList')
  list.innerHTML = `<div class="card">Lade…</div>`
  try{
    const { rows, count } = await fetchReservations()
    list.innerHTML = `
      <div class="grid head" style="grid-template-columns:1.4fr 1fr 1fr 1fr 1fr">
        <div>Gastname</div><div>Anreise</div><div>Abreise</div><div>Hotel</div><div>Rate</div>
      </div>
      ${renderReservationRows(rows)}
    `
    const totalPages = Math.max(1, Math.ceil(count/resPageSize))
    $('#resPageinfo').textContent = `Seite ${resPage} von ${totalPages} (${count} Einträge)`
    $('#resPrev').disabled = resPage<=1
    $('#resNext').disabled = resPage>=totalPages
  }catch(e){
    console.error(e); list.innerHTML = `<div class="card">Fehler: ${e.message}</div>`
  }
}

// ===== AVAILABILITY =====
function mountAvailability(){
  // Hotels befüllen
  const sel = $('#availHotel')
  sel.innerHTML = HOTELS.map(h=>`<option>${h}</option>`).join('')
  // Standard Start: heute
  const today = new Date(); const iso = today.toISOString().slice(0,10)
  $('#availStart').value = iso
  $('#availGenerate').onclick = renderAvailability
  renderAvailability()
}
function renderAvailability(){
  const start = new Date($('#availStart').value)
  const days = Math.min(Math.max(parseInt($('#availDays').value||'14',10),1),30)
  const hotel = $('#availHotel').value
  // Demo-Daten (später via HNS/OPERA): total fix, occupied pseudo
  const total = 319
  const rows = []
  for(let i=0;i<days;i++){
    const d = new Date(start); d.setDate(d.getDate()+i)
    const occ = Math.floor((80 + Math.sin(i/2)*20 + (i*3)%15))  // pseudo
    const booked = Math.min(Math.max(occ,0), total)
    const pct = Math.round((booked/total)*100)
    rows.push({ date:d.toISOString().slice(0,10), booked, total, pct })
  }
  const table = `
    <div class="table">
      <table>
        <thead><tr><th>Hotel</th><th>Datum</th><th>Belegt</th><th>Zimmer gesamt</th><th>Auslastung</th></tr></thead>
        <tbody>
          ${rows.map(r=>{
            const cls = r.pct<60?'ok': r.pct<85?'warn':'bad'
            return `<tr>
              <td>${hotel}</td>
              <td>${r.date}</td>
              <td>${r.booked}</td>
              <td>${r.total}</td>
              <td><span class="pill ${cls}">${r.pct}%</span></td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>
  `
  $('#availTable').innerHTML = table
}
