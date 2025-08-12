/***** CONFIG — Supabase *****/
const SB_URL = "https://kytuiodojfcaggkvizto.supabase.co";
const SB_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU";
const supabase = window.supabase.createClient(SB_URL, SB_ANON_KEY);

/***** DATA — Hotels, Kategorien, Raten (dummy) *****/
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
// Dummy Configs per Hotel
const HOTEL_CATEGORIES = {
  default: ['Standard','Superior','Suite']
};
const HOTEL_RATES = {
  default: [
    { name:'Flex exkl. Frühstück', price:89 },
    { name:'Flex inkl. Frühstück', price:109 }
  ]
};

/***** HELPERS *****/
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
function download(filename, mime, content){
  const blob = new Blob([content], {type:mime}); const a=document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

/***** CLOCK + STATUS (Datum + Uhrzeit) *****/
function startClocks(){
  function tickLocal(){
    const d = new Date();
    q('#clockLocal').textContent = d.toLocaleTimeString('de-DE');
    q('#dateLocal').textContent  = d.toLocaleDateString('de-DE');
  }
  tickLocal(); setInterval(tickLocal, 1000);

  async function tickSrv(){
    try{
      const { data } = await supabase.rpc('get_server_time');
      if (data){
        const t = new Date(data.now);
        q('#clockServer').textContent = `srv ${t.toLocaleTimeString('de-DE')} (${data.tz})`;
        return;
      }
    }catch(e){}
    q('#clockServer').textContent = `srv ${new Date().toLocaleTimeString('de-DE')}`;
  }
  tickSrv(); setInterval(tickSrv, 15000);
}
async function refreshStatus(){
  const a = await supabase.from('reservations').select('id',{head:true,count:'exact'});
  const b = await supabase.from('availability').select('date',{head:true,count:'exact'});
  setChip(q('#chipSb'), !a.error && !b.error);
  setChip(q('#chipHns'), false); // waiting for HNS
}

/***** MINI-ANALYTICS (Dummy per Haus) *****/
function buildMiniAnalytics(){
  const list = q('#miniAnalyticsList'); list.innerHTML='';
  HOTELS.forEach(h=>{
    // 7-day dummy series
    const pts = Array.from({length:7}, ()=> Math.round(20 + Math.random()*60));
    const max = Math.max(...pts), min = Math.min(...pts);
    const path = pts.map((v,i)=>{
      const x = (i/(pts.length-1))*90;
      const y = 28 - ((v-min)/(Math.max(1,max-min)))*26 - 1;
      return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const yoyUp = Math.random() > 0.5;
    const item = el('div',{class:'la-item'},
      el('div',{class:'la-name'}, `${h.group} · ${h.name}`),
      (()=>{
        const svg = el('svg',{class:'spark',viewBox:'0 0 90 28',xmlns:'http://www.w3.org/2000/svg'});
        const p = el('path',{d:path, fill:'none', stroke: yoyUp?'#35e08a':'#ff4d6d','stroke-width':'2'});
        svg.append(p); return svg;
      })(),
      el('div',{class:`la-arrow ${yoyUp?'up':'down'}`}, yoyUp ? '↑' : '↓')
    );
    list.append(item);
  });
}

/***** MODALS (fixed center) *****/
const backdrop = q('#backdrop');
function openModal(id){ document.body.classList.add('modal-open'); backdrop.style.display='flex'; q('#'+id).style.display='block'; }
function closeModal(id){ q('#'+id).style.display='none'; backdrop.style.display='none'; document.body.classList.remove('modal-open'); }
qa('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('.modal').id)));
window.addEventListener('keydown',(e)=>{ if(e.key==='Escape'){ qa('.modal').forEach(m=>m.style.display='none'); backdrop.style.display='none'; document.body.classList.remove('modal-open'); }});

/***** KPI FILTERS *****/
function fillHotelFilter(selectEl){
  selectEl.innerHTML = '';
  selectEl.append(el('option',{value:'all'},'Gesamt'));
  HOTELS.forEach(h=> selectEl.append(el('option',{value:h.code}, `${h.group} · ${h.name}`)));
}

/***** KPI — Heute *****/
async function loadKpisToday(){
  const code = q('#kpiFilterToday').value;
  const hotel = code!=='all' ? HOTEL_BY_CODE[code] : null;
  const todayStart = soD(new Date());
  const nowISO = new Date().toISOString();
  const tDate = isoDate(todayStart);

  let q1 = supabase.from('reservations').select('rate_price,hotel_name,created_at,arrival,channel')
    .gte('created_at', todayStart.toISOString()).lte('created_at', nowISO);
  if (hotel) q1 = q1.eq('hotel_name', `${hotel.group} · ${hotel.name}`);
  let { data, error } = await q1;
  if (error || !data?.length){
    let q2 = supabase.from('reservations').select('rate_price,hotel_name,arrival,channel').eq('arrival', tDate);
    if (hotel) q2 = q2.eq('hotel_name', `${hotel.group} · ${hotel.name}`);
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
    try{
      const { data: occRows } = await supabase.rpc('availability_day_occupancy', { from_date: tDate, to_date: tDate });
      if (occRows?.length) tOcc = Math.round(Number(occRows[0].avg_occupancy||0));
    }catch(e){
      const r = await supabase.from('availability').select('capacity,booked').eq('date', tDate);
      if (!r.error && r.data?.length){
        const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
        tOcc = Math.round(avg);
      }
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
  const start = new Date(today); start.setDate(start.getDate()+1); // morgen
  const end   = new Date(today); end.setDate(end.getDate()+7);

  let q1 = supabase.from('reservations').select('rate_price,hotel_name,arrival,channel')
    .gte('arrival', isoDate(start)).lte('arrival', isoDate(end));
  if (hotel) q1 = q1.eq('hotel_name', `${hotel.group} · ${hotel.name}`);
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
    try{
      const { data: occRows } = await supabase.rpc('availability_day_occupancy', { from_date: isoDate(start), to_date: isoDate(end) });
      if (occRows?.length){
        const avg = occRows.reduce((s,r)=> s + Number(r.avg_occupancy||0), 0)/occRows.length;
        nOcc = Math.round(avg);
      }
    }catch(e){
      const r = await supabase.from('availability').select('capacity,booked')
        .gte('date', isoDate(start)).lte('date', isoDate(end));
      if (!r.error && r.data?.length){
        const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
        nOcc = Math.round(avg);
      }
    }
  }

  q('#nBookings').textContent = bookings;
  q('#nRevenue').textContent  = euro(revenue);
  q('#nADR').textContent      = euro(adr);
  q('#nOcc').textContent      = pct(nOcc);
}

/***** RESERVATION LIST (Filter + Edit) *****/
let page=1, pageSize=50, search='', fHotel='all', fResNo='', fFrom=null, fTo=null;

function fillFilters(){
  const sel = q('#filterHotel'); sel.innerHTML='';
  sel.append(el('option',{value:'all'},'Alle Hotels'));
  HOTELS.forEach(h=> sel.append(el('option',{value:h.code}, `${h.group} · ${h.name}`)));
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
  if (fHotel!=='all'){ const h = HOTEL_BY_CODE[fHotel]; if (h) query = query.eq('hotel_name', `${h.group} · ${h.name}`); }
  if (fFrom)   query = query.gte('arrival', fFrom);
  if (fTo)     query = query.lte('arrival', fTo);

  const { data, count, error } = await query;
  if (error){ console.warn('reservations list error', error); q('#pageInfo').textContent='Fehler'; return; }

  (data || []).forEach(row => {
    const tr = el('tr', { class: 'row', 'data-id': row.id },
      el('td', {}, row.reservation_number || '—'),
      el('td', {}, row.guest_last_name || '—'),
      el('td', {}, row.arrival ? D2.format(new Date(row.arrival)) : '—'),
      el('td', {}, row.departure ? D2.format(new Date(row.departure)) : '—'),
      el('td', {}, row.hotel_name || '—'),
      el('td', {}, row.category || '—'),
      el('td', {}, row.rate_name || '—'),
      el('td', {}, row.rate_price != null ? EUR.format(row.rate_price) : '—'),
      el('td', {}, row.status || 'confirmed')
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
q('#btnRefresh').addEventListener('click', ()=> loadReservations());
q('#prevPage').addEventListener('click', ()=>{ page = Math.max(1, page-1); loadReservations(); });
q('#nextPage').addEventListener('click', ()=>{ page = page+1; loadReservations(); });

/***** EDIT RESERVATION *****/
async function openEdit(id){
  const { data, error } = await supabase.from('reservations').select('*').eq('id', id).maybeSingle();
  if (error || !data) return alert('Konnte Reservierung nicht laden.');
  // fill
  q('#eResNo').value = data.reservation_number || '';
  q('#eStatus').value = data.status || 'confirmed';
  q('#eHotel').value = data.hotel_name || '';
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
    q('#editInfo').textContent = error ? ('Fehler: '+error.message) : 'Gespeichert.';
    await loadReservations();
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
    q('#editInfo').textContent = error ? ('Fehler: '+error.message) : 'Reservierung storniert.';
    await loadReservations();
  };

  // Tabs
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

/***** NEW RESERVATION — Wizard *****/
function wizardSet(step){
  qa('.wstep').forEach(b=>b.classList.toggle('active', b.dataset.step==step));
  qa('.wpage').forEach(p=>p.classList.add('hidden'));
  q('#w'+step).classList.remove('hidden');
  q('#btnPrev').disabled = step==='1';
  q('#btnNext').classList.toggle('hidden', step==='4');
  q('#btnCreate').classList.toggle('hidden', step!=='4');
}
q('#btnPrev').addEventListener('click', ()=>{
  const cur = Number(qa('.wstep.active')[0].dataset.step);
  wizardSet(String(Math.max(1,cur-1)));
});
q('#btnNext').addEventListener('click', ()=>{
  const cur = Number(qa('.wstep.active')[0].dataset.step);
  wizardSet(String(Math.min(4,cur+1)));
});

function fillHotelSelect(){
  const sel=q('#newHotel'); sel.innerHTML='';
  sel.append(el('option',{value:''},'Bitte wählen'));
  HOTELS.forEach(h=>sel.append(el('option',{value:h.code},`${h.group} · ${h.name}`)));
  sel.addEventListener('change', ()=>{
    // Kategorien/Raten für gewähltes Hotel (dummy: default)
    const cats = HOTEL_CATEGORIES['default'];
    const rates= HOTEL_RATES['default'];
    q('#newCat').innerHTML = cats.map(c=>`<option>${c}</option>`).join('');
    q('#newRate').innerHTML = rates.map(r=>`<option value="${r.name}" data-price="${r.price}">${r.name} (${EUR.format(r.price)})</option>`).join('');
    q('#newPrice').value = rates[0].price;
  });
}
q('#newRate').addEventListener('change',e=>{
  const price = e.target.selectedOptions[0]?.dataset.price; if (price) q('#newPrice').value = price;
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

async function createReservation(){
  const code=q('#newHotel').value; const h=HOTEL_BY_CODE[code];
  if (!h) return alert('Bitte Hotel wählen.');
  if (!q('#newLname').value.trim()) return alert('Nachname ist Pflicht.');

  const cc = parseCc();
  const payload = {
    reservation_number: genResNo(),
    status: 'confirmed',
    hotel_name: `${h.group} · ${h.name}`,
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
    company_name: q('#newCompany').value || null,
    company_vat: q('#newVat').value || null,
    invoice_email: q('#newInvEmail').value || null,
    company_address: q('#newAddress').value || null,
    // Payment placeholders
    cc_holder: cc.holder,
    cc_brand: cc.brand,
    cc_last4: cc.last4,
    cc_exp_month: cc.exp_m,
    cc_exp_year: cc.exp_y,
    channel: 'Direct',
    notes: 'wizard-insert'
  };

  const { error } = await supabase.from('reservations').insert(payload);
  q('#newInfo').textContent = error ? ('Fehler: ' + error.message) : 'Reservierung gespeichert.';
  if (!error){ await loadKpisToday(); await loadKpisNext(); await loadReservations(); setTimeout(()=>closeModal('modalNew'), 700); }
}

/***** AVAILABILITY (unchanged) *****/
function datesAhead(n=14){ return [...Array(n)].map((_,i)=>{const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); return d;}); }
async function buildMatrix(){
  const ds=datesAhead(14);
  const head=q('#matrixTable thead tr'); head.querySelectorAll('th:not(.sticky)').forEach(n=>n.remove());
  ds.forEach(d=> head.append(el('th',{}, Dm.format(d))));
  const body=q('#matrixBody'); body.innerHTML='';
  const from = isoDate(ds[0]), to = isoDate(ds.at(-1));
  for (const h of HOTELS){
    const tr=el('tr'); tr.append(el('td',{class:'sticky'}, `${h.group} · ${h.name}`));
    const { data } = await supabase.from('availability').select('date,capacity,booked').eq('hotel_code',h.code).gte('date',from).lte('date',to).order('date',{ascending:true});
    const map={}; (data||[]).forEach(r=>map[r.date]=r);
    ds.forEach(d=>{
      const k=isoDate(d), cap=map[k]?.capacity??100, b=map[k]?.booked??Math.floor(Math.random()*120);
      const lvl=b-cap<=0?0:(b-cap===1?1:2);
      tr.append(el('td',{}, el('span',{class:`pill lvl-${lvl}`}, `${Math.min(100, Math.round((b/cap)*100))}%`)));
    });
    body.append(tr);
  }
}

/***** REPORTING + EXPORT *****/
function setDefaultReportRange(){
  const to=soD(new Date()); const from=soD(new Date(Date.now()-29*86400000));
  q('#repFrom').value=isoDate(from); q('#repTo').value=isoDate(to);
}
async function runReport(){
  const from=q('#repFrom').value, to=q('#repTo').value;
  const { data, error } = await supabase.from('reservations').select('hotel_name,rate_price,created_at,channel')
    .gte('created_at', new Date(from).toISOString())
    .lte('created_at', new Date(new Date(to).getTime()+86399999).toISOString());
  const body=q('#repBody'); body.innerHTML='';
  if (error){ body.append(el('tr',{}, el('td',{colspan:'5'}, 'Fehler beim Laden'))); return; }
  const byHotel=new Map();
  (data||[]).forEach(r=>{
    const k=r.hotel_name||'—';
    const o=byHotel.get(k)||{bookings:0,revenue:0,ota:0};
    o.bookings++; o.revenue+=Number(r.rate_price||0); if ((r.channel||'').toLowerCase()==='ota') o.ota++;
    byHotel.set(k,o);
  });
  [...byHotel.entries()].sort((a,b)=>b[1].revenue-a[1].revenue).forEach(([hotel,o])=>{
    const adr=o.bookings?o.revenue/o.bookings:null;
    const otaShare = o.bookings? Math.round(o.ota/o.bookings*100):0;
    body.append(el('tr',{}, el('td',{},hotel), el('td',{},String(o.bookings)), el('td',{},EUR.format(o.revenue)), el('td',{}, adr!=null?EUR.format(adr):'—'), el('td',{}, otaShare+'%')));
  });
}

function toCSV(rows){
  return rows.map(r=>r.map(v=>{
    const s = (v==null?'':String(v)).replace(/"/g,'""'); return `"${s}"`;
  }).join(',')).join('\n');
}
function toXLS(rows, sheetName='Sheet1'){
  // Excel 2003 XML (SpreadsheetML) – wird von Excel geöffnet
  const header=`<?xml version="1.0"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="${sheetName}">
    <Table>`;
  const rowsXml = rows.map(r=>`<Row>`+r.map(c=>`<Cell><Data ss:Type="String">${String(c??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('')+`</Row>`).join('');
  const footer=`</Table></Worksheet></Workbook>`;
  return header+rowsXml+footer;
}

q('#repCsv').addEventListener('click', async ()=>{
  const tbody = qa('#repBody tr');
  const rows = [['Hotel','Buchungen','Umsatz','ADR','OTA-Anteil']];
  tbody.forEach(tr=>{
    const cells = [...tr.children].map(td=>td.textContent);
    rows.push(cells);
  });
  download('report.csv','text/csv;charset=utf-8', toCSV(rows));
});
q('#repXls').addEventListener('click', ()=>{
  const tbody = qa('#repBody tr');
  const rows = [['Hotel','Buchungen','Umsatz','ADR','OTA-Anteil']];
  tbody.forEach(tr=> rows.push([...tr.children].map(td=>td.textContent)));
  download('report.xls','application/vnd.ms-excel', toXLS(rows,'Report'));
});
q('#kpiCsv').addEventListener('click', ()=>{
  const rows = [
    ['Scope','Buchungen','Umsatz','ADR','ØAuslastung'],
    ['Heute', q('#tBookings').textContent, q('#tRevenue').textContent, q('#tADR').textContent, q('#tOcc').textContent],
    ['Nächste 7 Tage', q('#nBookings').textContent, q('#nRevenue').textContent, q('#nADR').textContent, q('#nOcc').textContent]
  ];
  download('kpi.csv','text/csv;charset=utf-8', toCSV(rows));
});
q('#kpiXls').addEventListener('click', ()=>{
  const rows = [
    ['Scope','Buchungen','Umsatz','ADR','ØAuslastung'],
    ['Heute', q('#tBookings').textContent, q('#tRevenue').textContent, q('#tADR').textContent, q('#tOcc').textContent],
    ['Nächste 7 Tage', q('#nBookings').textContent, q('#nRevenue').textContent, q('#nADR').textContent, q('#nOcc').textContent]
  ];
  download('kpi.xls','application/vnd.ms-excel', toXLS(rows,'KPI'));
});

/***** HOTELS SKETCH (unchanged simple) *****/
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

/***** EVENTS (buttons) *****/
q('#btnAvail').addEventListener('click', async ()=>{ await buildMatrix(); openModal('modalAvail'); });
q('#btnReporting').addEventListener('click', async ()=>{ setDefaultReportRange(); await runReport(); openModal('modalReporting'); });
q('#btnSettings').addEventListener('click', ()=> openModal('modalSettings'));
q('#btnNew').addEventListener('click', ()=>{ fillHotelSelect(); wizardSet('1'); q('#newInfo').textContent=''; openModal('modalNew'); });
q('#btnCreate').addEventListener('click', createReservation);
q('#btnSketch').addEventListener('click', ()=>{ buildSketch(); openModal('modalSketch'); });

/***** INIT *****/
(async function init(){
  // Header clocks + status
  startClocks();
  await refreshStatus(); setInterval(refreshStatus, 30000);

  // Left mini charts
  buildMiniAnalytics();

  // KPI filters
  fillHotelFilter(q('#kpiFilterToday'));
  fillHotelFilter(q('#kpiFilterNext'));
  q('#kpiFilterToday').addEventListener('change', loadKpisToday);
  q('#kpiFilterNext').addEventListener('change', loadKpisNext);

  // Reservation filters + list
  fillFilters();
  await loadKpisToday();
  await loadKpisNext();
  await loadReservations();
})();
