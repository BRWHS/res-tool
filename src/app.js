import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// === SUPABASE (deine echten Werte eintragen) ===
const SUPABASE_URL = "https://kytuiodojfcaggkvizto.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const hotels = [
  "MASEVEN München Dornach","MASEVEN München Trudering","MASEVEN Frankfurt","MASEVEN Stuttgart",
  "Fidelity Robenstein","Fidelity Struck","Fidelity Doerr","Fidelity Gr. Baum",
  "Fidelity Landskron","Fidelity Pürgl","Fidelity Seppl","Tante Alma Bonn"
]

const $ = s=>document.querySelector(s)
const $$ = s=>document.querySelectorAll(s)
const toast = $('#toast')

// ===== Modals =====
const overlay = $('#modal-overlay')
const modals = {
  new:   $('#modal-new'),
  list:  $('#modal-list'),
  avail: $('#modal-avail'),
  settings: $('#modal-settings'),
  report: $('#modal-report'),
  map: $('#modal-map'),
}
function openModal(key){
  overlay.hidden = false
  modals[key].showModal()
}
function closeAll(){
  overlay.hidden = true
  Object.values(modals).forEach(m=>m.open && m.close())
}
overlay.addEventListener('click', closeAll)
$$('[data-close]').forEach(b=> b.addEventListener('click', closeAll))
$$('[data-modal]').forEach(b=> b.addEventListener('click', ()=>openModal(b.dataset.modal)))

function showToast(msg, ms=2200){
  toast.textContent = msg
  toast.classList.add('show')
  setTimeout(()=> toast.classList.remove('show'), ms)
}

// ===== Neue Reservierung (Wizard im Modal) =====
const wizard = $('#wizard')
const state = {
  hotel:null, arrival:null, departure:null,
  category:null, rate:null,
  guest:{ first_name:'', last_name:'', email:'' }
}
const categories = ["Standard","Deluxe","Apartment"]
const rates = [
  {id:'FLEX_EX', name:'Flex exklusive Frühstück', price:89},
  {id:'FLEX_IN', name:'Flex inklusive Frühstück', price:109},
]

function viewStep1(){
  wizard.innerHTML = `
    <div class="grid cols-3 card">
      <label>Hotel
        <select id="hotel">
          <option value="">Bitte wählen…</option>
          ${hotels.map(h=>`<option ${state.hotel===h?'selected':''}>${h}</option>`).join('')}
        </select>
      </label>
      <label>Anreise <input id="arrival" type="date" value="${state.arrival||''}"/></label>
      <label>Abreise <input id="departure" type="date" value="${state.departure||''}"/></label>
    </div>
    <div class="toolbar">
      <button class="primary" id="to2" ${state.hotel&&state.arrival&&state.departure?'':'disabled'}>Weiter</button>
    </div>
  `
  $('#hotel').addEventListener('change',e=>{state.hotel=e.target.value; viewStep1()})
  $('#arrival').addEventListener('change',e=>{state.arrival=e.target.value; viewStep1()})
  $('#departure').addEventListener('change',e=>{state.departure=e.target.value; viewStep1()})
  $('#to2').addEventListener('click', viewStep2)
}

function viewStep2(){
  wizard.innerHTML = `
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">
      ${categories.map(c=>`
        <div class="card">
          <div class="kachel">
            <div><h3 style="margin:.2rem 0">${c}</h3><span class="muted">${state.arrival||'?'} – ${state.departure||'?'}</span></div>
            <div class="badge">${state.hotel||''}</div>
          </div>
          <details ${state.category===c?'open':''}>
            <summary>Diese Kategorie wählen</summary>
            <div class="grid rate">
              ${rates.map(r=>`
                <div class="card" style="display:grid;grid-template-columns:2fr 1fr auto;gap:10px;align-items:center">
                  <div><strong>${r.name}</strong></div>
                  <div><strong>${r.price} €</strong></div>
                  <div><button class="primary pick" data-cat="${c}" data-rate="${r.id}">Auswählen</button></div>
                </div>`).join('')}
            </div>
          </details>
        </div>`).join('')}
    </div>
    <div class="toolbar">
      <button id="back1">Zurück</button>
      <button class="primary" id="to3" ${state.rate?'':'disabled'}>Weiter</button>
    </div>
  `
  $$('.pick').forEach(btn=>btn.addEventListener('click',e=>{
    state.category = e.target.dataset.cat
    state.rate = e.target.dataset.rate
    showToast('Kategorie & Rate gesetzt')
    viewStep2()
  }))
  $('#back1').addEventListener('click', viewStep1)
  $('#to3').addEventListener('click', viewStep3)
}

function viewStep3(){
  const rate = rates.find(r=>r.id===state.rate)
  wizard.innerHTML = `
    <div class="card">
      <div><strong>Hotel:</strong> ${state.hotel||'-'}</div>
      <div><strong>Zeitraum:</strong> ${state.arrival||'?'} – ${state.departure||'?'}</div>
      <div><strong>Kategorie:</strong> ${state.category||'-'}</div>
      <div><strong>Rate:</strong> ${rate? rate.name+' ('+rate.price+' €)' : '-'}</div>
      <hr/>
      <div class="grid cols-3">
        <label>Vorname <input id="fn" value="${state.guest.first_name||''}" autocomplete="given-name"></label>
        <label>Nachname <input id="ln" value="${state.guest.last_name||''}" autocomplete="family-name"></label>
        <label>E-Mail <input id="em" value="${state.guest.email||''}" type="email" autocomplete="email"></label>
      </div>
    </div>
    <div class="toolbar">
      <button id="back2">Zurück</button>
      <button class="primary" id="submit" ${rate?'':'disabled'}>Reservierung abschicken</button>
    </div>
  `
  $('#fn').addEventListener('input',e=>state.guest.first_name=e.target.value)
  $('#ln').addEventListener('input',e=>state.guest.last_name=e.target.value)
  $('#em').addEventListener('input',e=>state.guest.email=e.target.value)
  $('#back2').addEventListener('click', viewStep2)
  $('#submit').addEventListener('click', submitReservation)
}

async function submitReservation(){
  const btn = $('#submit'); btn.disabled = true; btn.textContent='Wird gespeichert…'
  const payload = {
    hotel_id: state.hotel,
    arrival: state.arrival,
    departure: state.departure,
    category_id: state.category,
    rate_code: state.rate,
    guest_first_name: state.guest.first_name,
    guest_last_name: state.guest.last_name,
    guest_email: state.guest.email,
    created_at: new Date().toISOString()
  }
  try{
    const { data, error } = await supabase.from('reservations').insert(payload).select().single()
    if(error) throw error
    showToast('Gespeichert – ID '+data.id)
    closeAll()
    // optional: direkt Liste öffnen
    openModal('list'); renderList()
  }catch(e){
    console.error(e); showToast('Fehler: '+e.message, 4000)
    btn.disabled=false; btn.textContent='Reservierung abschicken'
  }
}

// ===== Reservierungen (Liste) =====
const pageSize = 50
let page = 1, query = ""
async function fetchPage(){
  const from = (page-1)*pageSize, to = from+pageSize-1
  const { count } = await supabase.from('reservations').select('*',{count:'exact',head:true})
  let sel = supabase.from('reservations')
    .select('id,hotel_id,arrival,departure,category_id,rate_code,guest_first_name,guest_last_name,guest_email,created_at')
    .order('created_at',{ascending:false}).range(from,to)
  if(query) sel = sel.ilike('guest_last_name', `%${query}%`)
  const { data, error } = await sel
  if(error){ throw error }
  return { data: data||[], count: count||0 }
}
function renderRows(rows){
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
          <button class="iconbtn" disabled>Ändern (später)</button>
          <button class="iconbtn" disabled>Stornieren (später)</button>
        </div>
      </div>
    </details>`).join('')
}
async function renderList(){
  try{
    const { data, count } = await fetchPage()
    $('#list').innerHTML = `
      <div class="grid head" style="grid-template-columns:1.4fr 1fr 1fr 1fr 1fr">
        <div>Gastname</div><div>Anreise</div><div>Abreise</div><div>Hotel</div><div>Rate</div>
      </div>
      ${renderRows(data)}`
    const totalPages = Math.max(1, Math.ceil((count||0)/pageSize))
    $('#pageinfo').textContent = `Seite ${page} von ${totalPages} (${count||0})`
    $('#prev').disabled = page<=1
    $('#next').disabled = page>=totalPages
  }catch(e){
    console.error(e)
    $('#list').innerHTML = `<div class="card">Fehler: ${e.message}</div>`
  }
}
$('#search')?.addEventListener('input',e=>{ query=e.target.value.trim(); page=1; renderList() })
$('#prev')?.addEventListener('click',()=>{ if(page>1){ page--; renderList() }})
$('#next')?.addEventListener('click',()=>{ page++; renderList() })

// ===== Verfügbarkeit (Dummy bis Datenquelle steht) =====
const stockByHotel = {
  "MASEVEN München Dornach":319,"MASEVEN München Trudering":289,"MASEVEN Frankfurt":220,"MASEVEN Stuttgart":180,
  "Fidelity Robenstein":140,"Fidelity Struck":110,"Fidelity Doerr":95,"Fidelity Gr. Baum":160,
  "Fidelity Landskron":120,"Fidelity Pürgl":80,"Fidelity Seppl":100,"Tante Alma Bonn":150
}
function renderAvailability(fromISO, toISO){
  // Platzhalter: generiert pseudo-Belegung, bis echte Quelle (HNS/Opera) angeschlossen ist
  const from = new Date(fromISO), to = new Date(toISO)
  if(!(fromISO&&toISO) || isNaN(from)||isNaN(to) || to<from){ $('#avail-table').innerHTML='<div class="card">Bitte gültigen Zeitraum wählen.</div>'; return }
  const days = []
  for(let d=new Date(from); d<=to; d.setDate(d.getDate()+1)) days.push(new Date(d))
  let html = `<div class="card" style="overflow:auto"><table style="width:100%;border-collapse:collapse">
    <thead><tr><th style="text-align:left;padding:8px">Hotel</th>${days.map(d=>`<th style="padding:8px;text-align:right">${d.toLocaleDateString()}</th>`).join('')}</tr></thead><tbody>`
  for(const h of hotels){
    html += `<tr><td style="padding:8px">${h}</td>`
    for(const d of days){
      const stock = stockByHotel[h]||100
      const booked = Math.floor((stock* (0.35 + 0.5*Math.abs(Math.sin(d.getTime()/8.64e7 + h.length))))) // pseudo
      const pct = Math.round((booked/stock)*100)
      html += `<td style="padding:8px;text-align:right">${booked} / ${stock} <span class="muted">(${pct}%)</span></td>`
    }
    html += `</tr>`
  }
  html += `</tbody></table></div>`
  $('#avail-table').innerHTML = html
}
$('#avail-refresh')?.addEventListener('click', ()=>{
  renderAvailability($('#avail-from').value, $('#avail-to').value)
})

// Defaults
viewStep1()
