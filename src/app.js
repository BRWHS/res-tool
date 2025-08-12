/***** Supabase *****/
const SB_URL = "https://kytuiodojfcaggkvizto.supabase.co";
const SB_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU";
const supabase = window.supabase.createClient(SB_URL, SB_ANON_KEY);

/***** Hotels (einfacher Anzeigename = name) *****/
const HOTELS = [
  { group:'MASEVEN',  name:'MASEVEN München Dornach',   code:'MA7-M-DOR' },
  { group:'MASEVEN',  name:'MASEVEN München Trudering', code:'MA7-M-TRU' },
  { group:'MASEVEN',  name:'MASEVEN Frankfurt',         code:'MA7-FRA' },
  { group:'MASEVEN',  name:'MASEVEN Stuttgart',         code:'MA7-STR' },
  { group:'Fidelity', name:'Fidelity Robenstein',       code:'FID-ROB' },
  { group:'Fidelity', name:'Fidelity Struck',           code:'FID-STR' },
  { group:'Fidelity', name:'Fidelity Doerr',            code:'FID-DOE' },
  { group:'Fidelity', name:'Fidelity Gr. Baum',         code:'FID-GRB' },
  { group:'Fidelity', name:'Fidelity Landskron',        code:'FID-LAN' },
  { group:'Fidelity', name:'Fidelity Pürgl',            code:'FID-PUE' },
  { group:'Fidelity', name:'Fidelity Seppl',            code:'FID-SEP' },
  { group:'Tante Alma', name:'Tante Alma Bonn',         code:'TAL-BON' },
  { group:'Tante Alma', name:'Tante Alma Köln',         code:'TAL-KOE' },
  { group:'Tante Alma', name:'Tante Alma Erfurt',       code:'TAL-ERF' },
  { group:'Tante Alma', name:'Tante Alma Mannheim',     code:'TAL-MAN' },
  { group:'Tante Alma', name:'Tante Alma Mülheim',      code:'TAL-MUE' },
  { group:'Tante Alma', name:'Tante Alma Sonnen',       code:'TAL-SON' },
  { group:'Delta by Marriot', name:'Delta by Marriot Offenbach', code:'DBM-OF' },
  { group:'Villa Viva', name:'Villa Viva Hamburg',      code:'VV-HH' },
];
const HOTEL_BY_CODE = Object.fromEntries(HOTELS.map(h=>[h.code,h]));
const DEDUP_PREFIXES = ['MASEVEN','Fidelity','Tante Alma','Delta by Marriot','Villa Viva'];
function cleanHotelDisplayName(s){
  if (!s) return '—';
  const parts = s.split(' · ');
  if (parts.length===2 && DEDUP_PREFIXES.includes(parts[0])) return parts[1];
  return s;
}

/***** Dummy Kategorien/Raten je Hotel (später aus HNS) *****/
const HOTEL_CATEGORIES = { default: ['Standard','Superior','Suite'] };
const HOTEL_RATES = { default: [ {name:'Flex exkl. Frühstück', price:89}, {name:'Flex inkl. Frühstück', price:109} ] };

/***** Helpers *****/
const D2 = new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
const Dm = new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit'});
const EUR = new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'});
const euro = v=>v==null?'— €':EUR.format(v);
const pct  = v=>v==null?'—%':`${v}%`;
const soD = d=>{const x=new Date(d); x.setHours(0,0,0,0); return x;};
const isoDate = d => d.toISOString().slice(0,10);
const q = s=>document.querySelector(s);
const qa = s=>Array.from(document.querySelectorAll(s));
function el(tag,attrs={},...kids){ const e=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>k==='class'?e.className=v:k==='html'?e.innerHTML=v:e.setAttribute(k,v)); kids.forEach(k=>e.append(k)); return e; }
function setChip(node, ok){ node.classList.remove('lvl-2','lvl-1','lvl-0'); node.classList.add(ok?'lvl-0':'lvl-1'); }
function download(filename, mime, content){ const blob = new Blob([content], {type:mime}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000); }

/***** Header clocks (nur lokal) *****/
function startClocks(){
  function tickLocal(){
    const d = new Date();
    q('#clockLocal').textContent = d.toLocaleTimeString('de-DE');
    q('#dateLocal').textContent  = d.toLocaleDateString('de-DE');
  }
  tickLocal(); setInterval(tickLocal, 1000);
}
async function refreshStatus(){
  const a = await supabase.from('reservations').select('id',{head:true,count:'exact'});
  const b = await supabase.from('availability').select('date',{head:true,count:'exact'});
  setChip(q('#chipSb'), !a.error && !b.error);
  setChip(q('#chipHns'), false);
}

/***** Mini-Analytics (klein, ohne Doppel-Namen) *****/
function buildMiniAnalytics(){
  const list = q('#miniAnalyticsDock'); list.innerHTML='';
  HOTELS.forEach(h=>{
    const pts = Array.from({length:7}, ()=> Math.round(20 + Math.random()*60));
    const max = Math.max(...pts), min = Math.min(...pts);
    const path = pts.map((v,i)=>{
      const x = (i/(pts.length-1))*70;
      const y = 22 - ((v-min)/(Math.max(1,max-min)))*20 - 1;
      return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const yoyUp = Math.random() > 0.5;
    const item = el('div',{class:'dock-item'},
      el('span',{class:'dock-badge'}, h.group),
      el('div',{class:'dock-name'}, h.name),
      (()=>{
        const svg = el('svg',{class:'spark',viewBox:'0 0 70 22',xmlns:'http://www.w3.org/2000/svg'});
        svg.append(el('path',{d:path, fill:'none', stroke: yoyUp?'#35e08a':'#ff4d6d','stroke-width':'2'}));
        return svg;
      })(),
      el('div',{class:`dock-arrow ${yoyUp?'up':'down'}`}, yoyUp ? '↑' : '↓')
    );
    list.append(item);
  });
}
q('#dockToggle')?.addEventListener('click', ()=> q('.analytics-dock').classList.toggle('dock-collapsed'));

/***** MODALS *****/
const backdrop = q('#backdrop');
function openModal(id){ document.body.classList.add('modal-open'); backdrop.style.display='flex'; q('#'+id).style.display='block'; }
function closeModal(id){ q('#'+id).style.display='none'; backdrop.style.display='none'; document.body.classList.remove('modal-open'); }
qa('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('.modal').id)));
window.addEventListener('keydown',(e)=>{ if(e.key==='Escape'){ qa('.modal').forEach(m=>m.style.display='none'); backdrop.style.display='none'; document.body.classList.remove('modal-open'); }});

/***** KPI FILTERS *****/
function fillHotelFilter(selectEl){
  selectEl.innerHTML = '';
  selectEl.append(el('option',{value:'all'},'Gesamt'));
  HOTELS.forEach(h=> selectEl.append(el('option',{value:h.code}, h.name)));
}

/***** KPI — Heute *****/
async function loadKpisToday(){
  const code = q('#kpiFilterToday').value;
  const hotel = code!=='all' ? HOTEL_BY_CODE[code] : null;
  const todayStart = soD(new Date());
  const nowISO = new Date().toISOString();
  const tDate = isoDate(todayStart);

  let q1 = supabase.from('reservations').select('rate_price,hotel_name,created_at,arrival')
    .gte('created_at', todayStart.toISOString()).lte('created_at', nowISO);
  if (hotel) q1 = q1.eq('hotel_name', hotel.name);
  let { data, error } = await q1;
  if (error || !data?.length){
    let q2 = supabase.from('reservations').select('rate_price,hotel_name,arrival').eq('arrival', tDate);
    if (hotel) q2 = q2.eq('hotel_name', hotel.name);
    const r2 = await q2; if (!r2.error) data = r2.data;
  }
  const rows = data || [];
  const bookings = rows.length;
  const revenue  = rows.reduce((s,r)=> s + Number(r.rate_price||0), 0);
  const adr      = bookings ? Math.round((revenue/bookings)*100)/100 : null;

  let tOcc = null;
  if (hotel){
    const r = await supabase.from('availability').select('capacity,booked').eq('hotel_code', hotel.code).eq('date', tDate);
    if (!r.error && r.data?.length){
      const a = r.data[0]; tOcc = Math.round(Math.min(100, (Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100));
    }
  } else {
    const r = await supabase.from('availability').select('capacity,booked').eq('date', tDate);
    if (!r.error && r.data?.length){
      const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
      tOcc = Math.round(avg);
    }
  }

  q('#tBookings').textContent = bookings;
  q('#tRevenue').textContent  = euro(revenue);
  q('#tADR').textContent      = euro(adr);
  q('#tOcc').textContent      = pct(tOcc);
}

/***** KPI — Nächste 7 Tage (ab morgen) *****/
async function loadKpisNext(){
  const code = q('#kpiFilterNext').value;
  const hotel = code!=='all' ? HOTEL_BY_CODE[code] : null;
  const today = soD(new Date());
  const start = new Date(today); start.setDate(start.getDate()+1);
  const end   = new Date(today); end.setDate(end.getDate()+7);

  let q1 = supabase.from('reservations').select('rate_price,hotel_name,arrival')
    .gte('arrival', isoDate(start)).lte('arrival', isoDate(end));
  if (hotel) q1 = q1.eq('hotel_name', hotel.name);
  const { data, error } = await q1;
  const rows = (!error && Array.isArray(data)) ? data : [];
  const bookings = rows.length;
  const revenue  = rows.reduce((s,r)=> s + Number(r.rate_price||0), 0);
  const adr      = bookings ? Math.round((revenue/bookings)*100)/100 : null;

  let nOcc = null;
  if (hotel){
    const r = await supabase.from('availability').select('capacity,booked')
      .eq('hotel_code', hotel.code).gte('date', isoDate(start)).lte('date', isoDate(end));
    if (!r.error && r.data?.length){
      const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
      nOcc = Math.round(avg);
    }
  } else {
    const r = await supabase.from('availability').select('capacity,booked')
      .gte('date', isoDate(start)).lte('date', isoDate(end));
    if (!r.error && r.data?.length){
      const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
      nOcc = Math.round(avg);
    }
  }

  q('#nBookings').textContent = bookings;
  q('#nRevenue').textContent  = euro(revenue);
  q('#nADR').textContent      = euro(adr);
  q('#nOcc').textContent      = pct(nOcc);
}

/***** RES LIST (Filter inkl. Status, default confirmed) *****/
let page=1, pageSize=50, search='', fHotel='all', fResNo='', fFrom=null, fTo=null, fStatus='confirmed';

function fillFilters(){
  const sel = q('#filterHotel'); sel.innerHTML='';
  sel.append(el('option',{value:'all'},'Alle Hotels'));
  HOTELS.forEach(h=> sel.append(el('option',{value:h.code}, h.name)));
}

async function loadReservations(){
  const body = q('#resvBody'); body.innerHTML = '';
  const from = (page-1)*pageSize, to = from + pageSize - 1;
  let query = supabase.from('reservations')
    .select('id,reservation_number,guest_last_name,arrival,departure,hotel_name,category,rate_name,rate_price,status', { count:'exact' })
    .order('arrival', { ascending: true })
    .range(from, to);

  if (search)  query = query.ilike('guest_last_name', `%${search}%`);
  if (fResNo)  query = query.ilike('reservation_number', `%${fResNo}%`);
  if (fHotel!=='all'){ const h = HOTEL_BY_CODE[fHotel]; if (h) query = query.eq('hotel_name', h.name); }
  if (fFrom)   query = query.gte('arrival', fFrom);
  if (fTo)     query = query.lte('arrival', fTo);
  if (fStatus!=='all') query = query.eq('status', fStatus);

  const { data, count, error } = await query;
  if (error){ q('#pageInfo').textContent='Fehler'; console.warn(error); return; }

  (data || []).forEach(row => {
    const status = (row.status||'confirmed').toLowerCase();
    const dotCls = status==='canceled'?'dot-canceled':(status==='pending'?'dot-pending':'dot-confirmed');
    const tr = el('tr', { class: 'row', 'data-id': row.id },
      el('td', {}, row.reservation_number || '—'),
      el('td', {}, row.guest_last_name || '—'),
      el('td', {}, row.arrival ? D2.format(new Date(row.arrival)) : '—'),
      el('td', {}, row.departure ? D2.format(new Date(row.departure)) : '—'),
      el('td', {}, cleanHotelDisplayName(row.hotel_name) || '—'),
      el('td', {}, row.category || '—'),
      el('td', {}, row.rate_name || '—'),
      el('td', {}, row.rate_price != null ? EUR.format(row.rate_price) : '—'),
      (()=>{
        const td = el('td',{class:'status'});
        td.append(el('span',{class:`status-dot ${dotCls}`}));
        td.append(document.createTextNode(status));
        return td;
      })()
    );
    tr.addEventListener('click', ()=> openEdit(row.id));
    body.append(tr);
  });

  const totalPages = Math.max(1, Math.ceil((count || 0)/pageSize));
  q('#pageInfo').textContent = `Seite ${page} / ${totalPages}`;
}

q('#searchInput').addEventListener('input', (e)=>{ search = e.target.value.trim(); page = 1; loadReservations(); });
q('#filterHotel').addEventListener('change', (e)=>{ fHotel = e.target.value; page=1; loadReservations(); });
q('#filterResNo').addEventListener('input', (e)=>{ fResNo = e.target.value.trim(); page=1; loadReservations(); });
q('#filterFrom').addEventListener('change', (e)=>{ fFrom = e.target.value||null; page=1; loadReservations(); });
q('#filterTo').addEventListener('change',   (e)=>{ fTo   = e.target.value||null; page=1; loadReservations(); });
q('#filterStatus').addEventListener('change', (e)=>{ fStatus = e.target.value; page=1; loadReservations(); });
q('#btnRefresh').addEventListener('click', ()=> loadReservations());
q('#prevPage').addEventListener('click', ()=>{ page = Math.max(1, page-1); loadReservations(); });
q('#nextPage').addEventListener('click', ()=>{ page = page+1; loadReservations(); });

/***** EDIT RESERVATION (unchanged from last, keeps notes & payment) *****/
async function openEdit(id){
  const { data, error } = await supabase.from('reservations').select('*').eq('id', id).maybeSingle();
  if (error || !data) return alert('Konnte Reservierung nicht laden.');
  q('#eResNo').value = data.reservation_number || '';
  q('#eStatus').value = data.status || 'confirmed';
  q('#eHotel').value = cleanHotelDisplayName(data.hotel_name) || '';
  q('#eLname').value = data.guest_last_name || '';
  q('#eArr').value = data.arrival ? isoDate(new Date(data.arrival)) : '';
  q('#eDep').value = data.departure ? isoDate(new Date(data.departure)) : '';
  q('#eCat').value = data.category || '';
  q('#eRate').value = data.rate_name || '';
  q('#ePrice').value = data.rate_price || 0;
  q('#eNotes').value = data.notes || '';

  q('#eCcHolder').value = data.cc_holder || '';
  q('#eCcBrand').value  = data.cc_brand  || '';
  q('#eCcLast4').value  = data.cc_last4  || '';
  q('#eCcExpM').value   = data.cc_exp_month || '';
  q('#eCcExpY').value   = data.cc_exp_year  || '';

  q('#btnSaveEdit').onclick = async ()=>{
    const payload = {
      status: q('#eStatus').value,
      guest_last_name: q('#eLname').value,
      arrival: q('#eArr').value || null,
      departure: q('#eDep').value || null,
      category: q('#eCat').value,
      rate_name: q('#eRate').value,
      rate_price: Number(q('#ePrice').value||0),
      notes: q('#eNotes').value
    };
    const { error } = await supabase.from('reservations').update(payload).eq('id', id);
    q('#editInfo').textContent = error ? ('Fehler: '+error.message) : 'Gespeichert.'; await loadReservations();
  };

  q('#btnSavePay').onclick = async ()=>{
    const payload = {
      cc_holder: q('#eCcHolder').value || null,
      cc_brand:  q('#eCcBrand').value  || null,
      cc_last4:  q('#eCcLast4').value  || null,
      cc_exp_month: q('#eCcExpM').value ? Number(q('#eCcExpM').value) : null,
      cc_exp_year:  q('#eCcExpY').value ? Number(q('#eCcExpY').value) : null
    };
    const { error } = await supabase.from('reservations').update(payload).eq('id', id);
    q('#editInfo').textContent = error ? ('Fehler: '+error.message) : 'Zahlung aktualisiert.';
  };

  q('#btnCancelRes').onclick = async ()=>{
    const { error } = await supabase.from('reservations').update({ status:'canceled', canceled_at: new Date().toISOString() }).eq('id', id);
    q('#editInfo').textContent = error ? ('Fehler: '+error.message) : 'Reservierung storniert.'; await loadReservations();
  };

  qa('.tab').forEach(b=>b.classList.remove('active')); q('.tab[data-tab="tabDet"]').classList.add('active');
  qa('.tabpage').forEach(p=>p.classList.add('hidden')); q('#tabDet').classList.remove('hidden');
  openModal('modalEdit');
}
qa('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    qa('.tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
    qa('.tabpage').forEach(p=>p.classList.add('hidden'));
    q('#'+btn.dataset.tab).classList.remove('hidden');
  });
});

/***** NEW RESERVATION — Wizard (mit Summary + neuen Feldern) *****/
function wizardSet(step){
  qa('.wstep').forEach(b=>b.classList.toggle('active', b.dataset.step==step));
  qa('.wpage').forEach(p=>p.classList.add('hidden'));
  q('#w'+step).classList.remove('hidden');
  q('#btnPrev').disabled = step==='1';
  q('#btnNext').classList.toggle('hidden', step==='4');
  q('#btnCreate').classList.toggle('hidden', step!=='4');
  if (step==='4') updateSummary();
}
q('#btnPrev').addEventListener('click', ()=>{ const cur = Number(qa('.wstep.active')[0].dataset.step); wizardSet(String(Math.max(1,cur-1))); });
q('#btnNext').addEventListener('click', ()=>{ const cur = Number(qa('.wstep.active')[0].dataset.step); wizardSet(String(Math.min(4,cur+1))); });

function fillHotelSelect(){
  const sel=q('#newHotel'); sel.innerHTML='';
  sel.append(el('option',{value:''},'Bitte wählen'));
  HOTELS.forEach(h=>sel.append(el('option',{value:h.code},h.name)));
  sel.addEventListener('change', ()=>{
    const cats = HOTEL_CATEGORIES['default'];
    const rates= HOTEL_RATES['default'];
    q('#newCat').innerHTML = cats.map(c=>`<option>${c}</option>`).join('');
    q('#newRate').innerHTML = rates.map(r=>`<option value="${r.name}" data-price="${r.price}">${r.name} (${EUR.format(r.price)})</option>`).join('');
    q('#newPrice').value = rates[0].price; updateSummary();
  });
}
q('#newRate').addEventListener('change',e=>{ const price=e.target.selectedOptions[0]?.dataset.price; if(price) q('#newPrice').value=price; updateSummary(); });
['newArr','newDep','newGuests','newCat','newPrice','newFname','newLname','newEmail','newPhone','newStreet','newZip','newCity','newCompany','newVat','newCompanyZip','newAddress','newNotes'].forEach(id=>{
  document.addEventListener('input', (ev)=>{ if(ev.target?.id===id) updateSummary(); });
});

function genResNo(){ return 'R' + Date.now().toString(36).toUpperCase(); }
function parseCc(){
  const num = (q('#ccNumber').value || '').replace(/\D/g,'');
  const last4 = num.slice(-4) || null;
  const brand = q('#ccBrand').value || null;
  const holder= q('#ccHolder').value || null;
  const exp   = q('#ccExpiry').value || ''; // "MM/YY"
  const m = exp.match(/^(\d{1,2})\s*\/\s*(\d{2})$/);
  const exp_m = m ? Number(m[1]) : null;
  const exp_y = m ? Number(m[2]) : null;
  return { last4, brand, holder, exp_m, exp_y };
}
function updateSummary(){
  const code=q('#newHotel').value; const h=HOTEL_BY_CODE[code];
  const lines = [
    ['Hotel', h?.name || '—'],
    ['Zeitraum', (q('#newArr').value||'—') + ' → ' + (q('#newDep').value||'—')],
    ['Gäste', q('#newGuests').value||'—'],
    ['Kategorie', q('#newCat').value||'—'],
    ['Rate', q('#newRate').value||'—'],
    ['Preis', q('#newPrice').value?EUR.format(q('#newPrice').value):'—'],
    ['Gast', ((q('#newFname').value||'')+' '+(q('#newLname').value||'')).trim() || '—'],
    ['Kontakt', (q('#newEmail').value||'') + (q('#newPhone').value? ' / '+q('#newPhone').value :'')],
    ['Adresse', [q('#newStreet').value,q('#newZip').value,q('#newCity').value].filter(Boolean).join(', ') || '—'],
    ['Firma', [q('#newCompany').value,q('#newVat').value].filter(Boolean).join(' · ') || '—'],
    ['Firmenadresse', [q('#newCompanyZip').value,q('#newAddress').value].filter(Boolean).join(' ') || '—'],
    ['Notizen', q('#newNotes').value||'—']
  ];
  q('#summaryBox').innerHTML = '<table class="resv">'+lines.map(([k,v])=>`<tr><th style="color:var(--muted);font-weight:600;text-align:left;padding-right:8px;">${k}</th><td>${v}</td></tr>`).join('')+'</table>';
}

async function createReservation(){
  const code=q('#newHotel').value; const h=HOTEL_BY_CODE[code];
  if (!h) return alert('Bitte Hotel wählen.');
  if (!q('#newLname').value.trim()) return alert('Nachname ist Pflicht.');

  const cc = parseCc();
  const payload = {
    reservation_number: genResNo(),
    status: 'confirmed',
    hotel_name: h.name,
    hotel_code: code,
    arrival: q('#newArr').value || null,
    departure: q('#newDep').value || null,
    guests: Number(q('#newGuests').value||1),
    category: q('#newCat').value || null,
    rate_name: q('#newRate').value || null,
    rate_price: Number(q('#newPrice').value||0),
    guest_first_name: q('#newFname').value || null,
    guest_last_name: q('#newLname').value || null,
    guest_email: q('#newEmail').value || null,
    guest_phone: q('#newPhone').value || null,
    guest_street: q('#newStreet').value || null,
    guest_postal_code: q('#newZip').value || null,
    guest_city: q('#newCity').value || null,
    company_name: q('#newCompany').value || null,
    company_vat: q('#newVat').value || null,
    company_postal_code: q('#newCompanyZip').value || null,
    company_address: q('#newAddress').value || null,
    cc_holder: cc.holder,
    cc_brand: cc.brand,
    cc_last4: cc.last4,
    cc_exp_month: cc.exp_m,
    cc_exp_year: cc.exp_y,
    channel: 'Direct',
    notes: q('#newNotes').value || null
  };

  const { error } = await supabase.from('reservations').insert(payload);
  q('#newInfo').textContent = error ? ('Fehler: ' + error.message) : 'Reservierung gespeichert.';
  if (!error){ await loadKpisToday(); await loadKpisNext(); await loadReservations(); setTimeout(()=>closeModal('modalNew'), 700); }
}

/***** Availability mit Zeitraum + Farblegende *****/
function datesFrom(startDate, days){
  const ds=[]; const base = startDate? new Date(startDate) : soD(new Date());
  base.setHours(0,0,0,0);
  for(let i=0;i<days;i++){ const d=new Date(base); d.setDate(base.getDate()+i); ds.push(d); }
  return ds;
}
function occClass(p){ if (p>=90) return 'occ-r'; if (p>=65) return 'occ-o'; return 'occ-g'; }

async function buildMatrix(){
  const fromVal = q('#availFrom').value || isoDate(new Date());
  const days = Number(q('#availDays').value||14);
  const ds = datesFrom(fromVal, days);

  const head=q('#matrixTable thead tr'); head.querySelectorAll('th:not(.sticky)').forEach(n=>n.remove());
  ds.forEach(d=> head.append(el('th',{}, Dm.format(d))));
  const body=q('#matrixBody'); body.innerHTML='';

  const from = isoDate(ds[0]), to = isoDate(ds.at(-1));

  for (const h of HOTELS){
    const tr=el('tr');
    tr.append(el('td',{class:'sticky'}, h.name));
    const { data } = await supabase.from('availability')
      .select('date,capacity,booked')
      .eq('hotel_code', h.code)
      .gte('date', from).lte('date', to)
      .order('date',{ascending:true});
    const map={}; (data||[]).forEach(r=>map[r.date]=r);

    ds.forEach(d=>{
      const k=isoDate(d); const cap=map[k]?.capacity??100; const b=map[k]?.booked??0;
      const p = Math.min(100, Math.round((Number(b)/Math.max(1,Number(cap)))*100));
      tr.append(el('td',{}, el('span',{class:`pill ${occClass(p)}`}, `${p}%`)));
    });

    body.append(tr);
  }
}
q('#availRun').addEventListener('click', buildMatrix);

/***** Reporting (wie gehabt) *****/
function setDefaultReportRange(){
  const to=soD(new Date()); const from=soD(new Date(Date.now()-29*86400000));
  q('#repFrom').value=isoDate(from); q('#repTo').value=isoDate(to);
}

/***** Hotelskizze (simple) *****/
function buildSketch(){
  const wrap = q('#sketchGrid'); if(!wrap) return; wrap.innerHTML = '';
  HOTELS.forEach(h=>{
    wrap.append(el('div',{class:'hotel-card'},
      el('div',{class:'muted'}, h.group),
      el('div',{}, h.name),
      el('div',{class:'code'}, h.code)
    ));
  });
}

/***** EVENTS *****/
q('#btnAvail').addEventListener('click', async ()=>{
  q('#availFrom').value = isoDate(new Date());
  q('#availDays').value = '14';
  await buildMatrix();
  openModal('modalAvail');
});
q('#btnReporting').addEventListener('click', async ()=>{ setDefaultReportRange(); openModal('modalReporting'); });
q('#btnSettings').addEventListener('click', ()=> openModal('modalSettings'));
q('#btnNew').addEventListener('click', ()=>{ fillHotelSelect(); wizardSet('1'); q('#newInfo').textContent=''; openModal('modalNew'); });
q('#btnCreate').addEventListener('click', createReservation);
q('#btnSketch').addEventListener('click', ()=>{ buildSketch(); openModal('modalSketch'); });

/***** INIT *****/
(async function init(){
  startClocks();
  await refreshStatus(); setInterval(refreshStatus, 30000);

  buildMiniAnalytics();

  fillHotelFilter(q('#kpiFilterToday'));
  fillHotelFilter(q('#kpiFilterNext'));
  q('#kpiFilterToday').addEventListener('change', loadKpisToday);
  q('#kpiFilterNext').addEventListener('change', loadKpisNext);

  // Reservierungsliste Filter
  fillFilters();
  q('#filterStatus').value = 'confirmed'; // default
  // Pager & Suche handlers sind oben

  // KPIs + Liste initial
  await loadKpisToday();
  await loadKpisNext();
  await loadReservations();
})();
