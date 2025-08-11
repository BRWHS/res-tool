import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// TODO: Ersetze diese Werte (nur lokal testen!)
// In Vercel später als Environment Variables setzen.
const SUPABASE_URL = "https://kytuiodojfcaggkvizto.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const $ = (q)=>document.querySelector(q)
const app = $('#app')

// Client-State (persistiert im Browser)
const state = {
  hotel: null,
  arrival: null,
  departure: null,
  category: null,
  rate: null,
  guest: { first_name: '', last_name: '', email: '' },
}
const persist = ()=>localStorage.setItem('hasco', JSON.stringify(state))
const load = ()=>{ try{ Object.assign(state, JSON.parse(localStorage.getItem('hasco')||'{}')) }catch{} }
load()

function navigate() {
  const hash = location.hash || '#/step1'
  if (hash.startsWith('#/step1')) renderStep1()
  else if (hash.startsWith('#/step2')) renderStep2()
  else if (hash.startsWith('#/step3')) renderStep3()
}
window.addEventListener('hashchange', navigate)

// Dummy-Hotels + Kategorien
const hotels = [
  { id: 'MASEVEN-STG', name: 'MASEVEN Stuttgart' },
  { id: 'MASEVEN-MUC', name: 'MASEVEN München' }
]
const categoriesByHotel = {
  'MASEVEN-STG': [
    { id:'STD', name:'Standard', img:'https://picsum.photos/seed/std/800/450' },
    { id:'DLX', name:'Deluxe', img:'https://picsum.photos/seed/dlx/800/450' },
  ],
  'MASEVEN-MUC': [
    { id:'STD', name:'Standard', img:'https://picsum.photos/seed/std2/800/450' },
    { id:'APT', name:'Apartment', img:'https://picsum.photos/seed/apt/800/450' },
  ]
}
// Dummy-Raten
const dummyRates = [
  { id:'FLEX_EX', name:'Flex exklusive Frühstück', price:89, desc:'Test rate' },
  { id:'FLEX_IN', name:'Flex inklusive Frühstück', price:109, desc:'Test rate' },
]

function renderStep1() {
  app.innerHTML = `
    <h2>1) Reise planen</h2>
    <div class="card grid">
      <label>Hotel
        <select id="hotel">
          <option value="">Bitte wählen…</option>
          ${hotels.map(h=>`<option value="${h.id}" ${state.hotel===h.id?'selected':''}>${h.name}</option>`).join('')}
        </select>
      </label>
      <label>Anreise <input id="arrival" type="date" value="${state.arrival||''}"/></label>
      <label>Abreise <input id="departure" type="date" value="${state.departure||''}"/></label>
    </div>
    <div class="toolbar">
      <button class="primary" id="go2" ${state.hotel&&state.arrival&&state.departure?'':'disabled'}>Weiter zu Kategorien</button>
    </div>
  `
  $('#hotel').addEventListener('change', e=>{ state.hotel=e.target.value; persist(); renderStep1() })
  $('#arrival').addEventListener('change', e=>{ state.arrival=e.target.value; persist(); renderStep1() })
  $('#departure').addEventListener('change', e=>{ state.departure=e.target.value; persist(); renderStep1() })
  $('#go2').addEventListener('click', ()=>{ location.hash = '#/step2' })
}

function renderStep2() {
  const cats = categoriesByHotel[state.hotel]||[]
  app.innerHTML = `
    <h2>2) Kategorien</h2>
    <div class="grid" style="grid-template-columns: 1fr 1fr; gap:16px">
      ${cats.map(c=>`
        <div class="card">
          <div class="kachel">
            <div>
              <h3 style="margin:.2rem 0">${c.name}</h3>
              <span class="badge">${state.arrival||'?' } – ${state.departure||'?' }</span>
            </div>
            <img src="${c.img}" alt="">
          </div>
          <details ${state.category===c.id?'open':''}>
            <summary class="badge">Diese Kategorie wählen</summary>
            <div class="rate-list">
              ${dummyRates.map(r=>`
                <div class="grid rate">
                  <div>
                    <strong>${r.name}</strong><br>
                    <span class="muted">${r.desc}</span>
                  </div>
                  <div><strong>${r.price} €</strong></div>
                  <div><button data-cat="${c.id}" data-rate="${r.id}" class="primary select-rate">Auswählen</button></div>
                </div>
              `).join('')}
            </div>
          </details>
        </div>
      `).join('')}
    </div>
    <hr/>
    <div class="toolbar">
      <button id="back1">Zurück</button>
      <button class="primary" id="go3" ${state.rate?'':'disabled'}>Weiter</button>
    </div>
  `
  app.querySelectorAll('.select-rate').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      state.category = e.target.dataset.cat
      state.rate = e.target.dataset.rate
      persist()
      renderStep2()
    })
  })
  $('#back1').addEventListener('click', ()=>{ location.hash = '#/step1' })
  $('#go3').addEventListener('click', ()=>{ location.hash = '#/step3' })
}

function renderStep3() {
  const hotel = hotels.find(h=>h.id===state.hotel)
  const cats = categoriesByHotel[state.hotel]||[]
  const cat = cats.find(c=>c.id===state.category)
  const rate = dummyRates.find(r=>r.id===state.rate)
  app.innerHTML = `
    <h2>3) Zusammenfassung</h2>
    <div class="card">
      <div><strong>Hotel:</strong> ${hotel?.name||'-'}</div>
      <div><strong>Zeitraum:</strong> ${state.arrival||'?'} – ${state.departure||'?'}</div>
      <div><strong>Kategorie:</strong> ${cat?.name||'-'}</div>
      <div><strong>Rate:</strong> ${rate? rate.name + ' ('+rate.price+' €)' : '-'}</div>
      <hr/>
      <div class="grid">
        <label>Vorname <input id="fn" value="${state.guest.first_name||''}"></label>
        <label>Nachname <input id="ln" value="${state.guest.last_name||''}"></label>
        <label>E-Mail <input id="em" value="${state.guest.email||''}" type="email"></label>
      </div>
      <p class="muted">Kreditkartenfeld folgt (Tokenisierung; nie Klartext speichern).</p>
    </div>
    <div class="toolbar">
      <button id="back2">Zurück</button>
      <button class="primary" id="submit" ${hotel&&state.arrival&&state.departure&&cat&&rate?'':'disabled'}>Reservierung abschicken</button>
    </div>
  `
  $('#fn').addEventListener('input', e=>{ state.guest.first_name = e.target.value; persist() })
  $('#ln').addEventListener('input', e=>{ state.guest.last_name = e.target.value; persist() })
  $('#em').addEventListener('input', e=>{ state.guest.email = e.target.value; persist() })
  $('#back2').addEventListener('click', ()=>{ location.hash = '#/step2' })
  $('#submit').addEventListener('click', submitReservation)
}

async function submitReservation(){
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
  try {
    const { data, error } = await supabase.from('reservations').insert(payload).select().single()
    if(error) throw error
    alert('Reservierung gespeichert! ID: '+data.id)
    state.rate=null; persist();
    location.href = 'reservierungen.html'
  } catch (e) {
    console.error(e)
    alert('Fehler beim Speichern: '+e.message)
  }
}

navigate()