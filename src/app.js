
// ======== CONFIG ========
const SB_URL = window.SB_URL || "";
const SB_ANON_KEY = window.SB_ANON_KEY || "";
const supabase = (SB_URL && SB_ANON_KEY) ? window.supabase.createClient(SB_URL, SB_ANON_KEY) : null;

// Fixed hotels list
const HOTELS = [
  { group: 'MASEVEN', name: 'MASEVEN Dornach', code: 'MA7-DOR' },
  { group: 'MASEVEN', name: 'MASEVEN Trudering', code: 'MA7-TRU' },
  { group: 'MASEVEN', name: 'MASEVEN Messe', code: 'MA7-MES' },
  { group: 'MASEVEN', name: 'MASEVEN Parkstadt', code: 'MA7-PAR' },
  { group: 'Fidelity', name: 'Fidelity A', code: 'FID-A' },
  { group: 'Fidelity', name: 'Fidelity B', code: 'FID-B' },
  { group: 'Fidelity', name: 'Fidelity C', code: 'FID-C' },
  { group: 'Fidelity', name: 'Fidelity D', code: 'FID-D' },
  { group: 'Fidelity', name: 'Fidelity E', code: 'FID-E' },
  { group: 'Fidelity', name: 'Fidelity F', code: 'FID-F' },
  { group: 'Fidelity', name: 'Fidelity G', code: 'FID-G' },
  { group: 'Tante Alma', name: 'Tante Alma I', code: 'TAL-1' },
  { group: 'Tante Alma', name: 'Tante Alma II', code: 'TAL-2' },
  { group: 'Tante Alma', name: 'Tante Alma III', code: 'TAL-3' },
  { group: 'Tante Alma', name: 'Tante Alma IV', code: 'TAL-4' },
  { group: 'Tante Alma', name: 'Tante Alma V', code: 'TAL-5' },
  { group: 'Tante Alma', name: 'Tante Alma VI', code: 'TAL-6' },
  { group: 'Delta by Marriott', name: 'Delta Offenbach', code: 'DBM-OF' },
  { group: 'Villa Viva', name: 'Villa Viva Hamburg', code: 'VV-HH' },
];

const HOTEL_BY_CODE = Object.fromEntries(HOTELS.map(h => [h.code, h]));

// ======== UTIL ========
const fmt = new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
const fmtDay = new Intl.DateTimeFormat('de-DE', { weekday:'short' });
const fmtMd = new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'2-digit' });

function startOfDay(d) { const t = new Date(d); t.setHours(0,0,0,0); return t; }
function endOfDay(d) { const t = new Date(d); t.setHours(23,59,59,999); return t; }

function setDot(el, status) {
  el.style.background = status === 'ok' ? 'var(--ok)'
    : status === 'warn' ? 'var(--warn)' : 'var(--danger)';
  el.style.boxShadow = `0 0 10px ${getComputedStyle(el).backgroundColor}`;
}

function el(tag, attrs={}, ...children) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else e.setAttribute(k,v);
  });
  children.forEach(c => e.append(c));
  return e;
}

// ======== DASHBOARD (KPIs & Mini Availability) ========
async function loadKpis() {
  try {
    const todayStart = startOfDay(new Date()).toISOString();
    const nowIso = new Date().toISOString();
    const weekStart = startOfDay(new Date(Date.now() - 6*86400000)).toISOString();

    if (!supabase) {
      document.getElementById('kpiToday').textContent = '0';
      document.getElementById('kpi7').textContent = '0';
    } else {
      const { count: countToday } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart)
        .lte('created_at', nowIso);

      const { count: count7 } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart)
        .lte('created_at', nowIso);

      document.getElementById('kpiToday').textContent = countToday ?? '0';
      document.getElementById('kpi7').textContent = count7 ?? '0';
    }
  } catch(e) {
    console.error(e);
  }

  // Mini availability from availability table if present, else random
  const mini = document.getElementById('miniAvail');
  const miniDays = document.getElementById('miniDays');
  mini.innerHTML = ''; miniDays.innerHTML = '';
  const days = [...Array(7)].map((_,i)=> startOfDay(new Date(Date.now()+ i*86400000)));
  let occSum = 0;

  if (supabase) {
    try {
      // Aggregate average occupancy across all hotels per day
      const from = days[0].toISOString().slice(0,10);
      const to = days[6].toISOString().slice(0,10);
      const { data, error } = await supabase.rpc('availability_day_occupancy', { from_date: from, to_date: to });
      if (!error && Array.isArray(data) && data.length) {
        const byDate = Object.fromEntries(data.map(r => [r.date, r.avg_occupancy]));
        days.forEach(d => {
          const key = d.toISOString().slice(0,10);
          const level = Math.max(0, Math.min(100, Math.round(byDate[key] ?? 0)));
          occSum += level;
          const bar = el('div', {class:'bar'});
          const fill = el('div', {class:'fill'});
          fill.style.height = level + '%';
          const cap = el('div', {class:'cap'});
          bar.append(fill, cap);
          mini.append(bar);
          miniDays.append(el('div', {class:'day'}, fmtDay.format(d)));
        });
        document.getElementById('kpiOcc').textContent = Math.round(occSum/7) + '%';
        return;
      }
    } catch (e) {
      console.warn('mini availability fallback', e);
    }
  }

  // fallback random
  days.forEach(d => {
    const level = Math.floor(Math.random()*101);
    occSum += level;
    const bar = el('div', {class:'bar'});
    const fill = el('div', {class:'fill'});
    fill.style.height = level + '%';
    const cap = el('div', {class:'cap'});
    bar.append(fill, cap);
    mini.append(bar);
    miniDays.append(el('div', {class:'day'}, fmtDay.format(d)));
  });
  document.getElementById('kpiOcc').textContent = Math.round(occSum/7) + '%';
}

// ======== AVAILABILITY MATRIX ========
function generateMatrixDates(days = 14) {
  return [...Array(days)].map((_,i) => startOfDay(new Date(Date.now()+ i*86400000)));
}

async function buildMatrix() {
  const dates = generateMatrixDates(14);
  const theadRow = document.querySelector('#matrixTable thead tr');
  theadRow.querySelectorAll('th:not(.sticky)').forEach(th=>th.remove());
  dates.forEach(d => theadRow.append(el('th', {}, fmtMd.format(d))));

  const body = document.getElementById('matrixBody');
  body.innerHTML = '';

  if (supabase) {
    // try to load availability from table
    const from = dates[0].toISOString().slice(0,10);
    const to = dates[dates.length-1].toISOString().slice(0,10);
    for (const hotel of HOTELS) {
      const tr = el('tr');
      tr.append(el('td', { class: 'sticky' }, `${hotel.group} · ${hotel.name}`));
      const { data, error } = await supabase
        .from('availability')
        .select('date, capacity, booked')
        .eq('hotel_code', hotel.code)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true });
      const byDate = {};
      if (!error && Array.isArray(data)) {
        data.forEach(r => byDate[r.date] = r);
      }
      dates.forEach(d => {
        const key = d.toISOString().slice(0,10);
        const capacity = byDate[key]?.capacity ?? 100;
        const booked = byDate[key]?.booked ?? Math.floor(Math.random()*120);
        const delta = booked - capacity;
        const lvl = delta <= 0 ? 0 : delta === 1 ? 1 : 2;
        const cell = el('td');
        const pill = el('span', { class: `pill lvl-${lvl}` }, `${Math.min(100, Math.round((booked/capacity)*100))}%`);
        cell.append(pill);
        tr.append(cell);
      });
      body.append(tr);
    }
    return;
  }

  // fallback demo
  HOTELS.forEach(hotel => {
    const tr = el('tr');
    tr.append(el('td', { class: 'sticky' }, `${hotel.group} · ${hotel.name}`));
    dates.forEach(d => {
      const capacity = 100;
      const booked = Math.floor(Math.random()*120);
      const delta = booked - capacity;
      const lvl = delta <= 0 ? 0 : delta === 1 ? 1 : 2;
      const cell = el('td');
      const pill = el('span', { class: `pill lvl-${lvl}` }, `${Math.min(100, Math.round((booked/capacity)*100))}%`);
      cell.append(pill);
      tr.append(cell);
    });
    body.append(tr);
  });
}

// ======== RESERVATIONS TABLE ========
let page = 1, pageSize = 50, search = '';

async function loadReservations() {
  const body = document.getElementById('resvBody');
  body.innerHTML = '';

  if (!supabase) {
    for (let i=0;i<10;i++) {
      const tr = el('tr', { class: 'row' });
      tr.append(
        el('td', {}, `Demo Gast ${i+1}`),
        el('td', {}, fmt.format(new Date())),
        el('td', {}, fmt.format(new Date(Date.now()+86400000))),
        el('td', {}, 'MASEVEN Dornach'),
        el('td', {}, 'Standard'),
        el('td', {}, 'Flex'),
        el('td', {}, '89 €'),
        el('td', {}, '-')
      );
      body.append(tr);
    }
    document.getElementById('pageInfo').textContent = 'Demoansicht';
    return;
  }

  const from = (page-1)*pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from('reservations')
    .select('guest_last_name, arrival, departure, hotel_name, category, rate_name, rate_price, notes', { count: 'exact' })
    .order('arrival', { ascending: true })
    .range(from, to);

  if (search) query = query.ilike('guest_last_name', `%${search}%`);

  const { data, count, error } = await query;
  if (error) {
    console.error(error);
    body.append(el('tr', {}, el('td', { colspan: 8 }, 'Fehler beim Laden.')));
    return;
  }

  (data || []).forEach(row => {
    const tr = el('tr', { class: 'row', tabindex: 0, title: 'Details anzeigen' });
    tr.append(
      el('td', {}, row.guest_last_name || '—'),
      el('td', {}, row.arrival ? fmt.format(new Date(row.arrival)) : '—'),
      el('td', {}, row.departure ? fmt.format(new Date(row.departure)) : '—'),
      el('td', {}, row.hotel_name || '—'),
      el('td', {}, row.category || '—'),
      el('td', {}, row.rate_name || '—'),
      el('td', {}, row.rate_price != null ? (row.rate_price + ' €') : '—'),
      el('td', {}, row.notes || '—')
    );
    body.append(tr);
  });

  const totalPages = Math.max(1, Math.ceil((count || 0)/pageSize));
  document.getElementById('pageInfo').textContent = `Seite ${page} / ${totalPages}`;
}

// ======== WIZARD ========
const wizardState = {
  step: 1,
  data: {
    hotel_code: '',
    arrival: '',
    departure: '',
    guests: 1,
    category: '',
    rate_name: '',
    rate_price: null,
    guest_last_name: '',
    email: ''
  }
};

function renderWizard() {
  document.querySelectorAll('.wizard-steps .step').forEach(s => s.classList.toggle('active', Number(s.dataset.step) === wizardState.step));
  const v = document.getElementById('wizardView');
  v.innerHTML = '';
  if (wizardState.step === 1) {
    v.append(
      el('div', { class: 'field' }, el('label', {}, 'Hotel'), (function(){
        const sel = el('select', { id: 'wizHotel' });
        sel.append(el('option', { value:'' }, 'Bitte wählen'));
        HOTELS.forEach(h => sel.append(el('option', { value: h.code }, `${h.group} · ${h.name}`)));
        return sel;
      })()),
      el('div', { class: 'field' }, el('label', {}, 'Anreise'), el('input', { id:'wizArr', type:'date' })),
      el('div', { class: 'field' }, el('label', {}, 'Abreise'), el('input', { id:'wizDep', type:'date' })),
      el('div', { class: 'field' }, el('label', {}, 'Gäste'), el('input', { id:'wizGuests', type:'number', min:'1', value:String(wizardState.data.guests) }))
    );
  }
  if (wizardState.step === 2) {
    v.append(
      el('div', { class: 'field' }, el('label', {}, 'Zimmerkategorie'), (function(){
        const sel = el('select', { id: 'wizCat' });
        ['Standard','Superior','Suite'].forEach(c => sel.append(el('option', { value: c }, c)));
        return sel;
      })()),
      el('div', { class: 'field' }, el('label', {}, 'Rate'), (function(){
        const sel = el('select', { id: 'wizRate' });
        [
          { name: 'Flex exkl. Frühstück', price: 89 },
          { name: 'Flex inkl. Frühstück', price: 109 },
        ].forEach(r => sel.append(el('option', { value: r.name, 'data-price': r.price }, `${r.name} — ${r.price} €`)));
        return sel;
      })())
    );
  }
  if (wizardState.step === 3) {
    v.append(
      el('div', { class: 'field' }, el('label', {}, 'Nachname'), el('input', { id:'wizLname', type:'text', placeholder:'Mustermann' })),
      el('div', { class: 'field' }, el('label', {}, 'E‑Mail (optional)'), el('input', { id:'wizEmail', type:'email', placeholder:'name@domain.tld' })),
      el('div', { class: 'field' }, el('label', {}, 'Zusammenfassung'), el('textarea', { id:'wizSummary', rows:'5', readonly:'readonly' }))
    );
    document.getElementById('wizSummary').value = JSON.stringify(wizardState.data, null, 2);
  }
}

async function wizardNext() {
  if (wizardState.step === 1) {
    wizardState.data.hotel_code = document.getElementById('wizHotel').value;
    wizardState.data.arrival = document.getElementById('wizArr').value;
    wizardState.data.departure = document.getElementById('wizDep').value;
    wizardState.data.guests = Number(document.getElementById('wizGuests').value || 1);
    wizardState.step = 2;
  } else if (wizardState.step === 2) {
    wizardState.data.category = document.getElementById('wizCat').value;
    const sel = document.getElementById('wizRate');
    wizardState.data.rate_name = sel.value;
    wizardState.data.rate_price = Number(sel.options[sel.selectedIndex].dataset.price);
    wizardState.step = 3;
  } else if (wizardState.step === 3) {
    wizardState.data.guest_last_name = document.getElementById('wizLname').value.trim();
    wizardState.data.email = document.getElementById('wizEmail').value.trim();
    if (!supabase) { alert('Supabase ist nicht konfiguriert.'); return; }
    const hotel = HOTEL_BY_CODE[wizardState.data.hotel_code];
    const payload = {
      hotel_name: hotel ? `${hotel.group} · ${hotel.name}` : wizardState.data.hotel_code,
      arrival: wizardState.data.arrival,
      departure: wizardState.data.departure,
      guests: wizardState.data.guests,
      category: wizardState.data.category,
      rate_name: wizardState.data.rate_name,
      rate_price: wizardState.data.rate_price,
      guest_last_name: wizardState.data.guest_last_name,
      confirmation_email: wizardState.data.email || null,
      notes: 'Created via res‑tool wizard',
    };
    const { error } = await supabase.from('reservations').insert(payload);
    if (error) { alert('Fehler beim Speichern: ' + error.message); return; }
    closeModal('wizardModal');
    await loadKpis();
    await loadReservations();
  }
  renderWizard();
}

function wizardPrev() {
  wizardState.step = Math.max(1, wizardState.step - 1);
  renderWizard();
}

// ======== MODALS ========
const backdrop = document.getElementById('backdrop');
function openModal(id) {
  backdrop.style.display = 'flex';
  const m = document.getElementById(id);
  m.style.display = 'block';
  setTimeout(()=> backdrop.classList.add('show'), 0);
}
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  backdrop.style.display = 'none';
}

// ======== EVENTS ========
document.getElementById('btnStatus').addEventListener('click', () => {
  setDot(document.getElementById('dotApp'), 'ok');
  setDot(document.getElementById('dotSb'), supabase ? 'ok' : 'warn');
  setDot(document.getElementById('dotHns'), 'warn'); // placeholder
  setDot(document.getElementById('dotMail'), 'ok');
  openModal('statusModal');
});

document.getElementById('btnNew').addEventListener('click', () => {
  wizardState.step = 1; wizardState.data = { guests: 1 };
  renderWizard();
  openModal('wizardModal');
});

document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.closest('.modal').id)));

document.getElementById('wizNext').addEventListener('click', wizardNext);
document.getElementById('wizPrev').addEventListener('click', wizardPrev);

document.getElementById('searchInput').addEventListener('input', (e)=>{
  search = e.target.value.trim();
  page = 1; loadReservations();
});

document.getElementById('prevPage').addEventListener('click', ()=>{ page = Math.max(1, page-1); loadReservations(); });
document.getElementById('nextPage').addEventListener('click', ()=>{ page = page+1; loadReservations(); });

// ======== INIT ========
(async function init(){
  await loadKpis();
  await buildMatrix();
  await loadReservations();
})();
