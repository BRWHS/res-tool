
// ======== CONFIG ========
const SB_URL = https://kytuiodojfcaggkvizto.supabase.co || "";
const SB_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU || "";
const supabase = (SB_URL && SB_ANON_KEY) ? window.supabase.createClient(SB_URL, SB_ANON_KEY) : null;

// Hotels from user (exact names), custom codes for availability mapping
const HOTELS = [
  { group: 'MASEVEN', name: 'MASEVEN München Dornach', code: 'MA7-M-DOR' },
  { group: 'MASEVEN', name: 'MASEVEN München Trudering', code: 'MA7-M-TRU' },
  { group: 'MASEVEN', name: 'MASEVEN Frankfurt', code: 'MA7-FRA' },
  { group: 'MASEVEN', name: 'MASEVEN Stuttgart', code: 'MA7-STR' },
  { group: 'Fidelity', name: 'Fidelity Robenstein', code: 'FID-ROB' },
  { group: 'Fidelity', name: 'Fidelity Struck', code: 'FID-STR' },
  { group: 'Fidelity', name: 'Fidelity Doerr', code: 'FID-DOE' },
  { group: 'Fidelity', name: 'Fidelity Gr. Baum', code: 'FID-GRB' },
  { group: 'Fidelity', name: 'Fidelity Landskron', code: 'FID-LAN' },
  { group: 'Fidelity', name: 'Fidelity Pürgl', code: 'FID-PUE' },
  { group: 'Fidelity', name: 'Fidelity Seppl', code: 'FID-SEP' },
  { group: 'Tante Alma', name: 'Tante Alma Bonn', code: 'TAL-BON' },
  { group: 'Tante Alma', name: 'Tante Alma Köln', code: 'TAL-KOE' },
  { group: 'Tante Alma', name: 'Tante Alma Erfurt', code: 'TAL-ERF' },
  { group: 'Tante Alma', name: 'Tante Alma Mannheim', code: 'TAL-MAN' },
  { group: 'Tante Alma', name: 'Tante Alma Mülheim', code: 'TAL-MUE' },
  { group: 'Tante Alma', name: 'Tante Alma Sonnen', code: 'TAL-SON' },
  { group: 'Delta by Marriot', name: 'Delta by Marriot Offenbach', code: 'DBM-OF' },
  { group: 'Villa Viva', name: 'Villa Viva Hamburg', code: 'VV-HH' },
];

const HOTEL_BY_CODE = Object.fromEntries(HOTELS.map(h => [h.code, h]));

// ======== UTIL ========
const fmt = new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
const fmtMd = new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'2-digit' });

function startOfDay(d) { const t = new Date(d); t.setHours(0,0,0,0); return t; }

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

// ======== KPI AGGREGATION ========
async function loadKpis() {
  const todayStart = startOfDay(new Date());
  const now = new Date();
  const weekStart = startOfDay(new Date(Date.now() - 6*86400000));

  const ranges = {
    today: { from: todayStart.toISOString(), to: now.toISOString() },
    week: { from: weekStart.toISOString(), to: now.toISOString() }
  };

  const kpi = {
    today: { bookings: 0, revenue: 0, adr: null, occ: null, hotels: 0 },
    week:  { bookings: 0, revenue: 0, adr: null, occ: null, hotels: 0 }
  };

  if (!supabase) return kpi;

  async function aggReservations(fromIso, toIso) {
    const { data, error } = await supabase
      .from('reservations')
      .select('rate_price, hotel_name')
      .gte('created_at', fromIso)
      .lte('created_at', toIso);
    if (error) { console.warn(error); return { bookings:0, revenue:0, adr:null, hotels:0 }; }
    const bookings = data.length;
    const revenue = data.reduce((s,r)=> s + Number(r.rate_price || 0), 0);
    const adr = bookings ? Math.round((revenue / bookings) * 100) / 100 : null;
    const hotels = new Set(data.map(r => r.hotel_name).filter(Boolean)).size;
    return { bookings, revenue, adr, hotels };
  }

  async function aggOccupancy(fromDateStr, toDateStr) {
    try {
      const { data, error } = await supabase.rpc('availability_day_occupancy', { from_date: fromDateStr, to_date: toDateStr });
      if (!error && Array.isArray(data) && data.length) {
        const avg = data.reduce((s,r)=> s + Number(r.avg_occupancy || 0), 0) / data.length;
        return Math.round(avg);
      }
    } catch (e) {}
    const { data, error } = await supabase
      .from('availability')
      .select('capacity, booked')
      .gte('date', fromDateStr)
      .lte('date', toDateStr);
    if (error || !data || !data.length) return null;
    const avg = data.reduce((s,r)=> s + Math.min(100, Math.round((Number(r.booked||0)/Math.max(1,Number(r.capacity||0)))*100)), 0) / data.length;
    return Math.round(avg);
  }

  const t = await aggReservations(ranges.today.from, ranges.today.to);
  kpi.today = { ...kpi.today, ...t };
  const todayStr = todayStart.toISOString().slice(0,10);
  kpi.today.occ = await aggOccupancy(todayStr, todayStr);

  const w = await aggReservations(ranges.week.from, ranges.week.to);
  kpi.week = { ...kpi.week, ...w };
  const weekFromStr = weekStart.toISOString().slice(0,10);
  const weekToStr = todayStart.toISOString().slice(0,10);
  kpi.week.occ = await aggOccupancy(weekFromStr, weekToStr);

  const euro = (v) => (v==null ? '—' : new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(v));
  const pct = (v) => (v==null ? '—%' : (v + '%'));

  document.getElementById('tBookings').textContent = kpi.today.bookings;
  document.getElementById('tRevenue').textContent = euro(kpi.today.revenue);
  document.getElementById('tADR').textContent = kpi.today.adr==null ? '— €' : euro(kpi.today.adr);
  document.getElementById('tOcc').textContent = pct(kpi.today.occ);
  document.getElementById('tHotels').textContent = kpi.today.hotels;

  document.getElementById('wBookings').textContent = kpi.week.bookings;
  document.getElementById('wRevenue').textContent = euro(kpi.week.revenue);
  document.getElementById('wADR').textContent = kpi.week.adr==null ? '— €' : euro(kpi.week.adr);
  document.getElementById('wOcc').textContent = pct(kpi.week.occ);
  document.getElementById('wHotels').textContent = kpi.week.hotels;

  return kpi;
}

// ======== AVAILABILITY MATRIX (for popup) ========
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

  const from = dates[0].toISOString().slice(0,10);
  const to = dates[dates.length-1].toISOString().slice(0,10);

  for (const hotel of HOTELS) {
    const tr = el('tr');
    tr.append(el('td', { class: 'sticky' }, `${hotel.group} · ${hotel.name}`));

    let byDate = {};
    if (supabase) {
      const { data, error } = await supabase
        .from('availability')
        .select('date, capacity, booked')
        .eq('hotel_code', hotel.code)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true });
      if (!error && Array.isArray(data)) {
        data.forEach(r => byDate[r.date] = r);
      }
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
}

// ======== RESERVATIONS TABLE ========
let page = 1, pageSize = 50, search = '';

async function loadReservations() {
  const body = document.getElementById('resvBody');
  body.innerHTML = '';

  const from = (page-1)*pageSize;
  const to = from + pageSize - 1;

  if (!supabase) {
    document.getElementById('pageInfo').textContent = 'Demoansicht';
    return;
  }

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
      el('td', {}, row.arrival ? new Intl.DateTimeFormat('de-DE').format(new Date(row.arrival)) : '—'),
      el('td', {}, row.departure ? new Intl.DateTimeFormat('de-DE').format(new Date(row.departure)) : '—'),
      el('td', {}, row.hotel_name || '—'),
      el('td', {}, row.category || '—'),
      el('td', {}, row.rate_name || '—'),
      el('td', {}, row.rate_price != null ? (new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' }).format(row.rate_price)) : '—'),
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
}
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  backdrop.style.display = 'none';
}

// ======== EVENTS ========
document.getElementById('btnStatus').addEventListener('click', () => {
  setDot(document.getElementById('dotApp'), 'ok');
  setDot(document.getElementById('dotSb'), supabase ? 'ok' : 'warn');
  setDot(document.getElementById('dotHns'), 'warn');
  setDot(document.getElementById('dotMail'), 'ok');
  openModal('statusModal');
});

document.getElementById('btnAvail').addEventListener('click', async () => {
  await buildMatrix();
  openModal('availabilityModal');
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
  await loadReservations();
})();
