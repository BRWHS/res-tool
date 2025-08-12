/***** Supabase *****/
const SB_URL = "https://kytuiodojfcaggkvizto.supabase.co";
const SB_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU";
const supabase = window.supabase.createClient(SB_URL, SB_ANON_KEY);

/***** Hotels *****/
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

/***** Modals (zentriert, ESC schließt) *****/
const backdrop = q('#backdrop');
function openModal(id){ document.body.classList.add('modal-open'); backdrop.style.display='flex'; const m=q('#'+id); m.style.display='block'; m.focus?.(); }
function closeModal(id){ const m=q('#'+id); m.style.display='none'; backdrop.style.display='none'; document.body.classList.remove('modal-open'); }
qa('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('.modal').id)));
window.addEventListener('keydown',(e)=>{ if(e.key==='Escape'){ qa('.modal').forEach(m=>m.style.display='none'); backdrop.style.display='none'; document.body.classList.remove('modal-open'); }});

/***** Status + Uhren *****/
function startClocks(){
  setInterval(()=>{ q('#clockLocal').textContent = new Date().toLocaleTimeString('de-DE'); }, 1000);
  async function tickSrv(){
    try{
      const { data } = await supabase.rpc('get_server_time');
      if (data){ const t=new Date(data.now); q('#clockServer').textContent=`srv ${t.toLocaleTimeString('de-DE')} (${data.tz})`; return; }
    }catch(e){}
    q('#clockServer').textContent = `srv ${new Date().toLocaleTimeString('de-DE')}`;
  }
  tickSrv(); setInterval(tickSrv,15000);
}
async function refreshStatus(){
  const a = await supabase.from('reservations').select('id',{head:true,count:'exact'});
  const b = await supabase.from('availability').select('date',{head:true,count:'exact'});
  setChip(q('#chipSb'), !a.error && !b.error);
  setChip(q('#chipHns'), false);
}

/***** Hotel-Filter befüllen *****/
function fillHotelFilter(selectEl){
  selectEl.innerHTML = '';
  selectEl.append(el('option',{value:'all'},'Gesamt'));
  HOTELS.forEach(h=> selectEl.append(el('option',{value:h.code}, `${h.group} · ${h.name}`)));
}

/***** KPI — Heute (pro Karte eigener Filter) *****/
async function loadKpisToday(){
  const code = q('#kpiFilterToday').value;
  const hotel = code!=='all' ? HOTEL_BY_CODE[code] : null;
  const todayStart = soD(new Date());
  const nowISO = new Date().toISOString();
  const tDate = isoDate(todayStart);

  // Buchungen/Umsatz/ADR: heute nach created_at; Fallback arrival==heute
  let q1 = supabase.from('reservations').select('rate_price,hotel_name,created_at,arrival')
    .gte('created_at', todayStart.toISOString()).lte('created_at', nowISO);
  if (hotel) q1 = q1.eq('hotel_name', `${hotel.group} · ${hotel.name}`);
  let { data, error } = await q1;
  if (error || !data?.length){
    let q2 = supabase.from('reservations').select('rate_price,hotel_name,arrival')
      .eq('arrival', tDate);
    if (hotel) q2 = q2.eq('hotel_name', `${hotel.group} · ${hotel.name}`);
    const r2 = await q2; if (!r2.error) data = r2.data;
  }
  const rows = data || [];
  const bookings = rows.length;
  const revenue  = rows.reduce((s,r)=> s + Number(r.rate_price||0), 0);
  const adr      = bookings ? Math.round((revenue/bookings)*100)/100 : null;

  // Ø-Auslastung heute
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
  const end   = new Date(today); end.setDate(end.getDate()+7);     // inkl. +7
  const fromISO = start.toISOString();
  const toISO   = new Date(end.getTime()+86399999).toISOString();  // Tagesende

  // Buchungen/Umsatz/ADR: nach arrival im [morgen..+7]
  let q1 = supabase.from('reservations').select('rate_price,hotel_name,arrival')
    .gte('arrival', isoDate(start)).lte('arrival', isoDate(end));
  if (hotel) q1 = q1.eq('hotel_name', `${hotel.group} · ${hotel.name}`);
  const { data, error } = await q1;
  const rows = (!error && Array.isArray(data)) ? data : [];
  const bookings = rows.length;
  const revenue  = rows.reduce((s,r)=> s + Number(r.rate_price||0), 0);
  const adr      = bookings ? Math.round((revenue/bookings)*100)/100 : null;

  // Ø-Auslastung: availability im Zeitraum
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

/***** Reservierungen (Liste) *****/
let page=1, pageSize=50, search='';
async function loadReservations(){
  const body=q('#resvBody'); body.innerHTML='';
  const from=(page-1)*pageSize, to=from+pageSize-1;
  let query = supabase.from('reservations').select('guest_last_name,arrival,departure,hotel_name,category,rate_name,rate_price,notes',{count:'exact'})
    .order('arrival',{ascending:true}).range(from,to);
  if (search) query = query.ilike('guest_last_name', `%${search}%`);
  const { data, count } = await query;
  (data||[]).forEach(r=>{
    body.append(el('tr', {class:'row'},
      el('td',{}, r.guest_last_name||'—'),
      el('td',{}, r.arrival?D2.format(new Date(r.arrival)):'—'),
      el('td',{}, r.departure?D2.format(new Date(r.departure)):'—'),
      el('td',{}, r.hotel_name||'—'),
      el('td',{}, r.category||'—'),
      el('td',{}, r.rate_name||'—'),
      el('td',{}, r.rate_price!=null?EUR.format(r.rate_price):'—'),
      el('td',{}, r.notes||'—')
    ));
  });
  q('#pageInfo').textContent = `Seite ${page} / ${Math.max(1, Math.ceil((count||0)/pageSize))}`;
}
q('#searchInput').addEventListener('input', e=>{ search=e.target.value.trim(); page=1; loadReservations(); });
q('#prevPage').addEventListener('click', ()=>{ page=Math.max(1,page-1); loadReservations(); });
q('#nextPage').addEventListener('click', ()=>{ page=page+1; loadReservations(); });

/***** Availability (Popup) *****/
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

/***** Reporting *****/
function setDefaultReportRange(){
  const to=soD(new Date()); const from=soD(new Date(Date.now()-29*86400000));
  q('#repFrom').value=isoDate(from); q('#repTo').value=isoDate(to);
}
async function runReport(){
  const from=q('#repFrom').value, to=q('#repTo').value;
  const { data, error } = await supabase.from('reservations').select('hotel_name,rate_price,created_at')
    .gte('created_at', new Date(from).toISOString())
    .lte('created_at', new Date(new Date(to).getTime()+86399999).toISOString());
  const body=q('#repBody'); body.innerHTML='';
  if (error){ body.append(el('tr',{}, el('td',{colspan:'4'}, 'Fehler beim Laden'))); return; }
  const byHotel=new Map();
  (data||[]).forEach(r=>{ const k=r.hotel_name||'—'; const o=byHotel.get(k)||{bookings:0,revenue:0}; o.bookings++; o.revenue+=Number(r.rate_price||0); byHotel.set(k,o); });
  [...byHotel.entries()].sort((a,b)=>b[1].revenue-a[1].revenue).forEach(([hotel,o])=>{
    const adr=o.bookings?o.revenue/o.bookings:null;
    body.append(el('tr',{}, el('td',{},hotel), el('td',{},String(o.bookings)), el('td',{},EUR.format(o.revenue)), el('td',{}, adr!=null?EUR.format(adr):'—')));
  });
}

/***** Neue Reservierung *****/
function fillHotelSelect(){ const sel=q('#newHotel'); sel.innerHTML=''; sel.append(el('option',{value:''},'Bitte wählen')); HOTELS.forEach(h=> sel.append(el('option',{value:h.code},`${h.group} · ${h.name}`))); }
q('#newRate').addEventListener('change',e=>{ q('#newPrice').value = e.target.selectedOptions[0].dataset.price; });
async function createReservation(){
  const code=q('#newHotel').value; const h=HOTEL_BY_CODE[code]; if(!h) return alert('Bitte Hotel wählen.');
  const payload={ hotel_name:`${h.group} · ${h.name}`, arrival:q('#newArr').value||null, departure:q('#newDep').value||null,
    guests:Number(q('#newGuests').value||1), category:q('#newCat').value, rate_name:q('#newRate').value,
    rate_price:Number(q('#newPrice').value||0), guest_last_name:q('#newLname').value||null, notes:'ui-insert' };
  let { error } = await supabase.from('reservations').insert(payload);
  if (error && (error.message||'').toLowerCase().includes('hotel_id')){
    const probe = await supabase.from('reservations').select('hotel_id').eq('hotel_name',payload.hotel_name).limit(1).maybeSingle();
    const sample = probe.data?.hotel_id ?? (window.crypto?.randomUUID?.() || 1);
    const r2 = await supabase.from('reservations').insert({ ...payload, hotel_id: sample }); error = r2.error||null;
  }
  if (error){ q('#newInfo').textContent = 'Fehler: ' + error.message; return; }
  q('#newInfo').textContent='Reservierung gespeichert.'; await loadKpisToday(); await loadKpisNext(); await loadReservations(); setTimeout(()=>closeModal('modalNew'),600);
}

/***** Hotelskizze *****/
function buildSketch(){ const wrap=q('#sketchGrid'); wrap.innerHTML=''; HOTELS.forEach(h=> wrap.append(el('div',{class:'hotel-card'}, el('div',{class:'muted'},h.group), el('div',{},h.name), el('div',{class:'code'},h.code)))); }

/***** Events *****/
q('#btnAvail').addEventListener('click', async ()=>{ await buildMatrix(); openModal('modalAvail'); });
q('#btnReporting').addEventListener('click', async ()=>{ setDefaultReportRange(); await runReport(); openModal('modalReporting'); });
q('#btnSettings').addEventListener('click', ()=> openModal('modalSettings'));
q('#btnNew').addEventListener('click', ()=>{ fillHotelSelect(); q('#newInfo').textContent=''; openModal('modalNew'); });
q('#btnCreate').addEventListener('click', createReservation);
q('#btnSketch').addEventListener('click', ()=>{ buildSketch(); openModal('modalSketch'); });
q('#repRun').addEventListener('click', runReport);

// KPI Dropdown-Änderungen
document.addEventListener('change', (e)=>{
  if (e.target?.id === 'kpiFilterToday') loadKpisToday();
  if (e.target?.id === 'kpiFilterNext')  loadKpisNext();
});

/***** Init *****/
(async function init(){
  // Dropdowns befüllen
  fillHotelFilter(q('#kpiFilterToday'));
  fillHotelFilter(q('#kpiFilterNext'));

  // Uhren + Status
  startClocks(); await refreshStatus(); setInterval(refreshStatus,30000);

  // KPIs + Liste
  await loadKpisToday();
  await loadKpisNext();
  await loadReservations();
})();
