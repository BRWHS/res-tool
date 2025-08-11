import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// TODO: DEINE Keys eintragen (fürs Prototyping ok – vor Go-Live härtere RLS/Auth!)
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const $ = (q)=>document.querySelector(q)
const app = $('#app')
const toast = $('#toast')

// Client-State (persistiert)
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

function setProgress(step){
  const thumb = $('#progressThumb')
  const labels = [$('#s1'), $('#s2'), $('#s3')]
  const percent = step===1? 33 : step===2? 66 : 100
  thumb.style.width = percent + '%'
  labels.forEach((el,i)=> el.classList.toggle('active', i===step-1))
}

function navigate() {
  const hash = location.hash || '#/step1'
  if (hash.startsWith('#/step1')) { setProgress(1); renderStep1() }
  else if (hash.startsWith('#/step2')) { setProgress(2); renderStep2() }
  else if (hash.startsWith('#/step3')) { setProgress(3); renderStep3() }
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
const dummyRates = [
  { id:'FLEX_EX', name:'Flex exklusive Frühstück', price:89, desc:'Test rate' },
  { id:'FLEX_IN', name:'Flex inklusive Frühstück', price:109, desc:'Test rate' },
]

function showToast(msg, ms=2500){
  toast.textContent = msg
  toast.classList.add('show')
  setTimeout(()=> toast.classList.remove('show'), ms)
}

function validDates(a, d){
  if(!a || !d) return false
  const A = new Date(a), D = new Date(d)
  return !isNaN(A) && !isNaN(D) && D > A
}

/* STEP 1 */
function renderStep1() {
  app.innerHTML = `
    <h2>1) Reise planen</h2>
    <div class="card grid cols-3">
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
      <button class="primary" id="go2" ${state.hotel&&validDates(state.arrival,state.departure)?'':'disabled'}>Weiter zu Kategorien</button>
    </div>
    <p class="muted">Hinweis: Abreise muss nach Anreise liegen.</p>
  `
  $('#hotel').addEventListener('change', e=>{ state.hotel=e.target.value; persist(); renderStep1() })
  $('#arrival').addEventListener('change', e=>{ state.arrival=e.target.value; persist(); renderStep1() })
  $('#departure').addEventListener('change', e=>{ state.departure=e.target.value; persist(); renderStep1() })
  $('#go2').addEventListener('click', ()=>{ location.hash = '#/step2' })
}

/* STEP 2 */
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
            <img src="${c.img}" alt="" loading="lazy" class="skeleton" onload="this.classList.remove('skeleton')">
          </div>
          <details ${state.category===c.id?'open':''}>
            <summary><span>Diese Kategorie wählen</span></summary>
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
      showToast('Kategorie & Rate gesetzt')
      renderStep2()
    })
  })
  $('#back1').addEventListener('click', ()=>{ location.hash = '#/step1' })
  $('#go3').addEventListener('click', ()=>{ location.hash = '#/step3' })
}

/* STEP 3 */
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
      <div class="grid cols-3">
        <label>Vorname <input id="fn" value="${state.guest.first_name||''}" autocomplete="given-name"></label>
        <label>Nachname <input id="ln" value="${state.guest.last_name||''}" autocomplete="family-name"></label>
        <label>E-Mail <input id="em" value="${state.guest.email||''}" type="email" autocomplete="email"></label>
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
  const btn = $('#submit')
  btn.disabled = true
  btn.textContent = 'Wird gespeichert…'
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
    showToast('Reservierung gespeichert – ID ' + data.id)
    state.rate=null; persist();
    location.href = 'reservierungen.html'
  } catch (e) {
    console.error(e)
    showToast('Fehler beim Speichern: '+e.message, 4000)
    btn.disabled = false
    btn.textContent = 'Reservierung abschicken'
  }
}

navigate()
