/***** CONFIG – nur hier pflegen *****/
const SB_URL = "https://kytuiodojfcaggkvizto.supabase.co";
const SB_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU";
const supabase = window.supabase.createClient(SB_URL, SB_ANON_KEY);

/***** HOTEL-MAP (für Matrix & Wizard-Anzeige) *****/
const HOTELS = [
  { group: 'MASEVEN', name: 'MASEVEN München Dornach',   code: 'MA7-M-DOR' },
  { group: 'MASEVEN', name: 'MASEVEN München Trudering', code: 'MA7-M-TRU' },
  { group: 'MASEVEN', name: 'MASEVEN Frankfurt',         code: 'MA7-FRA'   },
  { group: 'MASEVEN', name: 'MASEVEN Stuttgart',         code: 'MA7-STR'   },
  { group: 'Fidelity', name: 'Fidelity Robenstein',      code: 'FID-ROB'   },
  { group: 'Fidelity', name: 'Fidelity Struck',          code: 'FID-STR'   },
  { group: 'Fidelity', name: 'Fidelity Doerr',           code: 'FID-DOE'   },
  { group: 'Fidelity', name: 'Fidelity Gr. Baum',        code: 'FID-GRB'   },
  { group: 'Fidelity', name: 'Fidelity Landskron',       code: 'FID-LAN'   },
  { group: 'Fidelity', name: 'Fidelity Pürgl',           code: 'FID-PUE'   },
  { group: 'Fidelity', name: 'Fidelity Seppl',           code: 'FID-SEP'   },
  { group: 'Tante Alma', name: 'Tante Alma Bonn',        code: 'TAL-BON'   },
  { group: 'Tante Alma', name: 'Tante Alma Köln',        code: 'TAL-KOE'   },
  { group: 'Tante Alma', name: 'Tante Alma Erfurt',      code: 'TAL-ERF'   },
  { group: 'Tante Alma', name: 'Tante Alma Mannheim',    code: 'TAL-MAN'   },
  { group: 'Tante Alma', name: 'Tante Alma Mülheim',     code: 'TAL-MUE'   },
  { group: 'Tante Alma', name: 'Tante Alma Sonnen',      code: 'TAL-SON'   },
  { group: 'Delta by Marriot', name: 'Delta by Marriot Offenbach', code: 'DBM-OF' },
  { group: 'Villa Viva', name: 'Villa Viva Hamburg',     code: 'VV-HH'     },
];

/***** HELPERS *****/
const D2 = new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
const Dm = new Intl.DateTimeFormat('de-DE', { day:'2-digit', month:'2-digit' });
const EUR = new Intl.NumberFormat('de-DE', { style:'currency', currency:'EUR' });
const pct = v => v==null ? '—%' : `${v}%`;
const euro = v => v==null ? '— €' : EUR.format(v);
const soD = d => { const x=new Date(d); x.setHours(0,0,0,0); return x; };
const q = s => document.querySelector(s);
const qa = s => Array.from(document.querySelectorAll(s));
function el(tag, attrs={}, ...kids){ const e=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=>k==='class'?e.className=v:k==='html'?e.innerHTML=v:e.setAttribute(k,v)); kids.forEach(k=>e.append(k)); return e; }
function setDot(elem, state){ elem.style.background = state==='ok'?'var(--ok)':state==='warn'?'var(--warn)':'var(--danger)'; elem.style.boxShadow=`0 0 10px ${getComputedStyle(elem).backgroundColor}`; }

/***** STATUS MODAL *****/
const backdrop = q('#backdrop');
function openModal(id){ backdrop.style.display='flex'; q('#'+id).style.display='block'; }
function closeModal(id){ q('#'+id).style.display='none'; backdrop.style.display='none'; }
qa('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('.modal').id)));

q('#btnStatus').addEventListener('click', async ()=>{
  setDot(q('#dotApp'),'ok');
  // einfache Read-Pings:
  const pingRes = await supabase.from('reservations').select('id', { count:'exact', head:true });
  const pingAv  = await supabase.from('availability').select('date', { count:'exact', head:true });
  setDot(q('#dotSb'), (!pingRes.error && !pingAv.error) ? 'ok' : 'warn');
  setDot(q('#dotHns'),'warn');
  setDot(q('#dotMail'),'ok');
  openModal('statusModal');
});

/***** KPI LOAD *****/
async function loadKpis(){
  const todayStart = soD(new Date());       const todayISO = todayStart.toISOString().slice(0,10);
  const weekStart  = soD(new Date(Date.now() - 6*86400000));
  const nowISO     = new Date().toISOString();

  // Reservations aggregieren (heute / 7 Tage) via created_at
  async function aggReservations(fromIso, toIso){
    const { data, error } = await supabase
      .from('reservations')
      .select('rate_price, hotel_name')
      .gte('created_at', fromIso)
      .lte('created_at', toIso);

    if (error) { console.warn('reservations agg error', error); return { bookings:0, revenue:0, adr:null, hotels:0 }; }
    const bookings = data.length;
    const revenue  = data.reduce((s,r)=> s + Number(r.rate_price||0), 0);
    const adr      = bookings ? Math.round((revenue/bookings)*100)/100 : null;
    const hotels   = new Set(data.map(r=>r.hotel_name).filter(Boolean)).size;
    return { bookings, revenue, adr, hotels };
  }

  // Ø-Auslastung über RPC, fallback availability
  async function occ(fromDate, toDate){
    try{
      const { data, error } = await supabase.rpc('availability_day_occupancy', { from_date: fromDate, to_date: toDate });
      if (!error && data?.length){ return Math.round(data.reduce((s,r)=>s+Number(r.avg_occupancy||0),0)/data.length); }
    }catch(e){}
    const { data, error } = await supabase.from('availability').select('capacity, booked').gte('date', fromDate).lte('date', toDate);
    if (error || !data?.length) return null;
    const avg = data.reduce((s,r)=> s + Math.min(100, Math.round((Number(r.booked||0)/Math.max(1,Number(r.capacity||0)))*100)), 0)/data.length;
    return Math.round(avg);
  }

  const t = await aggReservations(todayStart.toISOString(), nowISO);
  const w = await aggReservations(weekStart.toISOString(),  nowISO);
  const tOcc = await occ(todayISO, todayISO);
  const wOcc = await occ(weekStart.toISOString().slice(0,10), todayISO);

  q('#tBookings').textContent = t.bookings;
  q('#tRevenue').textContent  = euro(t.revenue);
  q('#tADR').textContent      = euro(t.adr);
  q('#tOcc').textContent      = pct(tOcc);
  q('#tHotels').textContent   = t.hotels;

  q('#wBookings').textContent = w.bookings;
  q('#wRevenue').textContent  = euro(w.revenue);
  q('#wADR').textContent      = euro(w.adr);
  q('#wOcc').textContent      = pct(wOcc);
  q('#wHotels').textContent   = w.hotels;
}

/***** RESERVATION LIST *****/
let page=1, pageSize=50, search='';
async function loadReservations(){
  const body = q('#resvBody'); body.innerHTML='';
  const from = (page-1)*pageSize, to = from + pageSize - 1;

  let query = supabase.from('reservations')
    .select('guest_last_name, arrival, departure, hotel_name, category, rate_name, rate_price, notes', { count:'exact' })
    .order('arrival', { ascending:true })
    .range(from, to);
  if (search) query = query.ilike('guest_last_name', `%${search}%`);

  const { data, count, error } = await query;
  if (error){ console.warn('reservations list error', error); q('#pageInfo').textContent='Fehler'; return; }

  (data||[]).forEach(r=>{
    const tr = el('tr', { class:'row' },
      el('td',{}, r.guest_last_name || '—'),
      el('td',{}, r.arrival ? D2.format(new Date(r.arrival)) : '—'),
      el('td',{}, r.departure ? D2.format(new Date(r.departure)) : '—'),
      el('td',{}, r.hotel_name || '—'),
      el('td',{}, r.category || '—'),
      el('td',{}, r.rate_name || '—'),
      el('td',{}, r.rate_price!=null ? EUR.format(r.rate_price) : '—'),
      el('td',{}, r.notes || '—'),
    );
    body.append(tr);
  });

  const total = Math.max(1, Math.ceil((count||0)/pageSize));
  q('#pageInfo').textContent = `Seite ${page} / ${total}`;
}
q('#searchInput').addEventListener('input', e=>{ search = e.target.value.trim(); page=1; loadReservations(); });
q('#prevPage').addEventListener('click', ()=>{ page=Math.max(1, page-1); loadReservations(); });
q('#nextPage').addEventListener('click', ()=>{ page=page+1; loadReservations(); });

/***** AVAILABILITY POPUP *****/
function datesAhead(n=14){ return [...Array(n)].map((_,i)=>soD(new Date(Date.now()+i*86400000))); }
async function buildMatrix(){
  const thead = q('#matrixTable thead tr'); thead.querySelectorAll('th:not(.sticky)').forEach(n=>n.remove());
  const ds = datesAhead(14);
  ds.forEach(d=> thead.append(el('th',{}, Dm.format(d))));

  const body = q('#matrixBody'); body.innerHTML='';
  const from = ds[0].toISOString().slice(0,10);
  const to   = ds[ds.length-1].toISOString().slice(0,10);

  for (const h of HOTELS){
    const tr = el('tr'); tr.append(el('td', { class:'sticky' }, `${h.group} · ${h.name}`));
    let map = {};
    const { data } = await supabase.from('availability')
      .select('date, capacity, booked')
      .eq('hotel_code', h.code).gte('date', from).lte('date', to).order('date', { ascending:true });
    (data||[]).forEach(r=>{ map[r.date]=r; });

    ds.forEach(d=>{
      const k = d.toISOString().slice(0,10);
      const cap = map[k]?.capacity ?? 100;
      const bkd = map[k]?.booked ?? Math.floor(Math.random()*120);
      const delta = bkd-cap; const lvl = delta<=0?0:delta===1?1:2;
      tr.append(el('td',{}, el('span', { class:`pill lvl-${lvl}` }, `${Math.min(100, Math.round((bkd/cap)*100))}%`)));
    });
    body.append(tr);
  }
}
q('#btnAvail').addEventListener('click', async ()=>{ await buildMatrix(); openModal('availabilityModal'); });

/***** WIZARD (Button deaktiviert, um Inserts gegen strenges Schema zu vermeiden) *****/
q('#btnNew').addEventListener('click', ()=> {
  alert('Wizard ist im Demo-Build deaktiviert (Insert kollidiert mit hotel_id-Constraints). Sobald HNS/Schema final ist, aktiviere ich das wieder.');
});

/***** INIT *****/
(async function init(){
  // Sichtbarer Ping in der Konsole → schnelle Diagnose
  const ping = await supabase.from('reservations').select('id', { head:true, count:'exact' });
  console.log('Supabase ping → reservations count:', ping.count, 'error:', ping.error || 'none');

  await loadKpis();
  await loadReservations();
})();
