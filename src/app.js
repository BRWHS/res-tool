(() => {
  // ===== Re-Init Guard (verhindert doppeltes Registrieren von Listenern) =====
  if (window.__RESTOOL_APP_V2__) return;
  window.__RESTOOL_APP_V2__ = true;

  /***** Supabase *****/
  const SB_URL = "https://kytuiodojfcaggkvizto.supabase.co";
  const SB_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU";
  const supabase = window.supabase.createClient(SB_URL, SB_ANON_KEY);

  /***** Bildquellen *****/
  const HOTEL_IMG_SRC  = "/assets/hotel-placeholder.png";
  const SKETCH_IMG_SRC = "/assets/sketch-placeholder.png";
  const IMG_FALLBACK = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'>
       <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
         <stop offset='0' stop-color='#0ea5b0'/><stop offset='1' stop-color='#052a36'/>
       </linearGradient></defs>
       <rect width='800' height='500' rx='24' fill='url(#g)'/>
       <text x='50%' y='50%' fill='#9adce6' font-family='Inter' font-size='24' text-anchor='middle'>Kein Bild</text>
     </svg>`
  );

  /***** Hotels (UI-Liste) *****/
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
  const BRAND_PREFIXES = ['MASEVEN','Fidelity','Tante Alma','Delta by Marriot','Villa Viva'];
  const hotelCity = (full) => {
    if(!full) return '';
    for (const p of BRAND_PREFIXES){ if(full.startsWith(p+' ')) return full.slice(p.length+1); }
    return full;
  };
  const displayHotel = (h) => h ? `${h.group} - ${hotelCity(h.name)}` : '—';

  /* Alias-Keyword für Filter-Fallback per hotel_name */
  const HOTEL_KEYWORD = {
    'MA7-M-DOR':'Dornach','MA7-M-TRU':'Trudering','MA7-FRA':'Frankfurt','MA7-STR':'Stuttgart',
    'FID-ROB':'Robenstein','FID-STR':'Struck','FID-DOE':'Doerr','FID-GRB':'Baum','FID-LAN':'Landskron','FID-PUE':'Pürgl','FID-SEP':'Seppl',
    'TAL-BON':'Bonn','TAL-KOE':'Köln','TAL-ERF':'Erfurt','TAL-MAN':'Mannheim','TAL-MUE':'Mülheim','TAL-SON':'Sonnen',
    'DBM-OF':'Offenbach','VV-HH':'Hamburg'
  };

  /***** Dummy Kategorien/Raten *****/
  const HOTEL_CATEGORIES = { default: ['Standard','Superior','Suite'] };
  const HOTEL_RATES = { default: [
    {name:'Flex exkl. Frühstück', price:89},
    {name:'Flex inkl. Frühstück', price:109}
  ]};

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
  function el(tag,attrs={},...kids){
    const e=document.createElement(tag);
    Object.entries(attrs).forEach(([k,v])=>{
      if (k==='class') e.className=v;
      else if (k==='html') e.innerHTML=v;
      else e.setAttribute(k,v);
    });
    kids.forEach(k=>e.append(k));
    return e;
  }
  function setChip(node, ok){ node?.classList.remove('lvl-2','lvl-1','lvl-0'); node?.classList.add(ok?'lvl-0':'lvl-1'); }
  function download(filename, mime, content){
    const blob = new Blob([content], {type:mime});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }

  /***** Bild-Helfer *****/
  function safeSetImg(imgEl, src){
    if (!imgEl) return;
    imgEl.onerror = null; // reset
    imgEl.src = src || SKETCH_IMG_SRC;
    imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = IMG_FALLBACK; };
  }
  function ensureHotelImageSlot(){
    const grid = q('#w1 .grid2');
    if (!grid) return null;
    let img = q('#hotelImg');
    if (img) return img;

    // Versuche die 2. Zelle (im HTML ist ein leerer <div> als Platzhalter)
    const slot = grid.children[1];
    const wrap = slot || el('div', {});
    wrap.classList.add('imgcard');
    wrap.style.maxWidth = '320px';
    wrap.style.justifySelf = 'end';

    img = el('img',{ id:'hotelImg', alt:'Hotelbild', style:'width:100%;border-radius:12px;display:block;' });
    wrap.innerHTML = '';
    wrap.append(img);

    if (!slot) grid.insertBefore(wrap, grid.firstChild?.nextSibling || null);
    return img;
  }
  function setHotelImage(src){
    const img = ensureHotelImageSlot();
    safeSetImg(img, src || HOTEL_IMG_SRC);
  }
  function setCatImage(src){
    safeSetImg(q('#imgCatPreview'), src || SKETCH_IMG_SRC);
  }
  function setSketchImage(src){
    safeSetImg(q('#sketchImage'), src || SKETCH_IMG_SRC);
  }

  /***** Clock + Status *****/
  function startClocks(){
    const tick=()=>{ const d=new Date();
      q('#clockLocal') && (q('#clockLocal').textContent=d.toLocaleTimeString('de-DE'));
      q('#dateLocal')  && (q('#dateLocal').textContent = d.toLocaleDateString('de-DE'));
    };
    tick(); setInterval(tick,1000);
  }
  async function refreshStatus(){
    const a = await supabase.from('reservations').select('id',{head:true,count:'exact'});
    const b = await supabase.from('availability').select('date',{head:true,count:'exact'});
    setChip(q('#chipSb'), !a.error && !b.error);
    setChip(q('#chipHns'), false);
  }

  /***** Auto-Roll: Vergangenheit → done *****/
  async function autoRollPastToDone(){
    const today = isoDate(soD(new Date()));
    await supabase.from('reservations')
      .update({ status:'done' })
      .lt('departure', today)
      .neq('status','canceled')
      .or('status.eq.active,status.eq.confirmed,status.is.null');

    await supabase.from('reservations')
      .update({ status:'done' })
      .is('departure', null)
      .lt('arrival', today)
      .neq('status','canceled')
      .or('status.eq.active,status.eq.confirmed,status.is.null');
  }

  /***** Mini-Analytics — YoY OTA (fallback Total) *****/
  async function buildMiniAnalytics(){
    const list = q('#miniAnalyticsDock'); if (!list) return; list.innerHTML='';
    const today = soD(new Date());
    const curStart = new Date(today); curStart.setDate(curStart.getDate()-6);
    const prevYStart = new Date(curStart); prevYStart.setFullYear(prevYStart.getFullYear()-1);
    const prevYEnd   = new Date(today);   prevYEnd.setFullYear(prevYEnd.getFullYear()-1);

    const cur = await supabase.from('reservations')
      .select('hotel_code,channel,created_at').gte('created_at', curStart.toISOString()).lte('created_at', today.toISOString());
    const prv = await supabase.from('reservations')
      .select('hotel_code,channel,created_at').gte('created_at', prevYStart.toISOString()).lte('created_at', prevYEnd.toISOString());

    const countOTA = a => (a?.data||[]).filter(r=>String(r.channel||'').toLowerCase()==='ota').length;
    const allOTAZero = countOTA(cur)===0 && countOTA(prv)===0;

    const toMap = (arr)=> {
      const m=new Map();
      (arr?.data||[]).forEach(r=>{
        const key = r.hotel_code || '—';
        const isOTA = String(r.channel||'').toLowerCase()==='ota';
        if (allOTAZero || isOTA){ m.set(key, (m.get(key)||0)+1); }
      });
      return m;
    };
    const mCur = toMap(cur), mPrv = toMap(prv);

    const SPARK_W = 60, SPARK_H = 22;

    HOTELS.forEach(h=>{
      const c = mCur.get(h.code)||0, p = mPrv.get(h.code)||0;
      const up = p===0 ? c>0 : c>p;

      const pts = Array.from({length:7}, ()=> Math.max(0, Math.round((c/7) + (Math.random()*2-1))));
      const max = Math.max(1, ...pts), min = Math.min(...pts);
      const path = pts.map((v,i)=>{
        const x = (i/(pts.length-1))*SPARK_W;
        const y = SPARK_H - ((v-min)/(max-min||1))*(SPARK_H-2) - 1;
        return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');

      const item = el('div',{class:'dock-item',title:`${displayHotel(h)} · YoY ${p?Math.round(((c-p)/p)*100):'∞'}%`},
        el('span',{class:'dock-badge'}, h.group),
        el('div',{class:'dock-name'}, displayHotel(h)),
        (()=>{
          const svg = el('svg',{class:'spark',viewBox:`0 0 ${SPARK_W} ${SPARK_H}`,xmlns:'http://www.w3.org/2000/svg'});
          svg.append(el('path',{d:path, fill:'none', stroke: up?'#35e08a':'#ff4d6d','stroke-width':'2'}));
          return svg;
        })(),
        el('div',{class:`dock-arrow ${up?'up':'down'}`}, up ? '↑' : '↓')
      );
      list.append(item);
    });
  }
  q('#dockToggle')?.addEventListener('click', ()=> q('.analytics-dock')?.classList.toggle('dock-collapsed'));

  /***** MODALS *****/
  const backdrop = q('#backdrop');
  function openModal(id){
    const m=q('#'+id); if(!m) return;
    document.body.classList.add('modal-open');
    backdrop.style.display='flex'; m.style.display='block';
  }
  function closeModal(id){
    const m=q('#'+id); if(!m) return;
    m.style.display='none'; backdrop.style.display='none'; document.body.classList.remove('modal-open');
  }
  qa('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('.modal').id)));
  window.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'){ qa('.modal').forEach(m=>m.style.display='none'); backdrop.style.display='none'; document.body.classList.remove('modal-open'); }
  });

  /***** KPI-Filter füllen *****/
  function fillHotelFilter(selectEl){
    if (!selectEl) return;
    selectEl.innerHTML = '';
    selectEl.append(el('option',{value:'all'},'Gesamt'));
    HOTELS.forEach(h=> selectEl.append(el('option',{value:h.code}, displayHotel(h))));
  }

  /***** KPI — Heute *****/
  async function loadKpisToday(){
    try {
      const sel = q('#kpiFilterToday');
      const code = sel ? sel.value : 'all';
      const hotel = code !== 'all' ? HOTELS.find(h=>h.code===code) : null;

      const today = soD(new Date());
      const tDate = isoDate(today);              // 'YYYY-MM-DD'
      const nowISO = new Date().toISOString();
      const startISO = today.toISOString();

      // (1) Buchungen heute
      let qb = supabase.from('reservations')
        .select('id,created_at')
        .gte('created_at', startISO)
        .lte('created_at', nowISO);
      if (hotel) qb = qb.eq('hotel_code', hotel.code);
      const rB = await qb;
      const bookingsToday = (rB.data || []).length;

      // (2) Heutige Aufenthalte (ohne leeren-String-Filter, damit kein 400)
      // A) arrival <= today AND departure >= today
      let qA = supabase.from('reservations')
        .select('id, rate_price, hotel_code, hotel_name, arrival, departure, status')
        .lte('arrival', tDate)
        .gte('departure', tDate)
        .neq('status', 'canceled');
      if (hotel) qA = qA.eq('hotel_code', hotel.code);

      // B) arrival <= today AND departure IS NULL (open-ended)
      let qB2 = supabase.from('reservations')
        .select('id, rate_price, hotel_code, hotel_name, arrival, departure, status')
        .lte('arrival', tDate)
        .is('departure', null)
        .neq('status', 'canceled');
      if (hotel) qB2 = qB2.eq('hotel_code', hotel.code);

      const [rA, rBopen] = await Promise.all([qA, qB2]);

      const byId = new Map();
      (rA.data||[]).forEach(x => byId.set(x.id, x));
      (rBopen.data||[]).forEach(x => byId.set(x.id, x));

      const isActiveToday = (row) => {
        const arr = row.arrival ? isoDate(new Date(row.arrival)) : null;
        const depRaw = row.departure;
        const dep = depRaw ? isoDate(new Date(depRaw)) : null;
        const noDep = depRaw == null || depRaw === '' || dep === null;
        const arrived = arr && arr <= tDate;
        const notLeft = noDep || (dep && dep >= tDate);
        const notCanceled = String(row.status||'').toLowerCase() !== 'canceled';
        return arrived && notLeft && notCanceled;
      };
      const activeToday = Array.from(byId.values()).filter(isActiveToday);

      const revenue = activeToday.reduce((s,r)=> s + Number(r.rate_price||0), 0);
      const adr = activeToday.length ? Math.round((revenue/activeToday.length)*100)/100 : null;

      // (3) Auslastung
      let occ = null;
      if (hotel){
        const r = await supabase.from('availability').select('capacity,booked').eq('hotel_code', hotel.code).eq('date', tDate);
        if (!r.error && r.data?.length){ const a = r.data[0]; occ = Math.round(Math.min(100, (Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)); }
      } else {
        const r = await supabase.from('availability').select('capacity,booked').eq('date', tDate);
        if (!r.error && r.data?.length){
          const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
          occ = Math.round(avg);
        }
      }

      q('#tBookings') && (q('#tBookings').textContent = bookingsToday);
      q('#tRevenue')  && (q('#tRevenue').textContent  = euro(revenue));
      q('#tADR')      && (q('#tADR').textContent      = euro(adr));
      q('#tOcc')      && (q('#tOcc').textContent      = pct(occ));
    } catch (err) {
      console.error('loadKpisToday fatal', err);
      q('#tBookings') && (q('#tBookings').textContent = '—');
      q('#tRevenue')  && (q('#tRevenue').textContent  = '— €');
      q('#tADR')      && (q('#tADR').textContent      = '— €');
      q('#tOcc')      && (q('#tOcc').textContent      = '—%');
    }
  }

  /***** KPI — Nächste 7 Tage *****/
  async function loadKpisNext(){
    try {
      const code = q('#kpiFilterNext')?.value || 'all';
      const hotel = code!=='all' ? HOTELS.find(h=>h.code===code) : null;

      const today = soD(new Date());
      const start = new Date(today); start.setDate(start.getDate()+1);
      const end   = new Date(today); end.setDate(end.getDate()+7);

      const startDate = isoDate(start);
      const endDate   = isoDate(end);
      const endPlus1  = new Date(end); endPlus1.setDate(endPlus1.getDate()+1);

      // Ohne "eq('departure','')" um 400er zu vermeiden
      let qA = supabase.from('reservations')
        .select('id, rate_price, hotel_code, arrival, departure, status')
        .neq('status','canceled')
        .lte('arrival', endDate)
        .gte('departure', startDate);
      if (hotel) qA = qA.eq('hotel_code', hotel.code);

      let qB = supabase.from('reservations')
        .select('id, rate_price, hotel_code, arrival, departure, status')
        .neq('status','canceled')
        .lte('arrival', endDate)
        .is('departure', null);
      if (hotel) qB = qB.eq('hotel_code', hotel.code);

      const [rA, rB] = await Promise.all([qA, qB]);

      const byId = new Map();
      (rA.data||[]).forEach(x => byId.set(x.id, x));
      (rB.data||[]).forEach(x => byId.set(x.id, x));
      const rows = Array.from(byId.values());

      const DAY = 86400000;
      let totalRevenue = 0, totalNights = 0;

      rows.forEach(r=>{
        const arr = soD(new Date(r.arrival));
        const dep = r.departure ? soD(new Date(r.departure)) : null; // checkout (exklusiv)
        const stayEndExcl = dep ? dep : endPlus1; // open-ended: bis Zeitraum-Ende
        const overlapStart = new Date(Math.max(arr.getTime(), start.getTime()));
        const overlapEndExcl = new Date(Math.min(stayEndExcl.getTime(), endPlus1.getTime()));
        const nights = Math.max(0, Math.round((overlapEndExcl - overlapStart)/DAY));
        if (nights > 0) {
          totalNights += nights;
          totalRevenue += Number(r.rate_price || 0) * nights;
        }
      });

      const adr = totalNights ? Math.round((totalRevenue/totalNights)*100)/100 : null;

      // Auslastung: Ø über Zeitraum
      let nOcc = null;
      if (hotel){
        const r = await supabase.from('availability').select('capacity,booked')
          .eq('hotel_code', hotel.code).gte('date', startDate).lte('date', endDate);
        if (!r.error && r.data?.length){
          const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
          nOcc = Math.round(avg);
        }
      } else {
        const r = await supabase.from('availability').select('capacity,booked')
          .gte('date', startDate).lte('date', endDate);
        if (!r.error && r.data?.length){
          const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
          nOcc = Math.round(avg);
        }
      }

      q('#nRevenue') && (q('#nRevenue').textContent = euro(totalRevenue));
      q('#nADR')     && (q('#nADR').textContent     = euro(adr));
      q('#nOcc')     && (q('#nOcc').textContent     = pct(nOcc));
    } catch (err) {
      console.error('loadKpisNext fatal', err);
      q('#nRevenue') && (q('#nRevenue').textContent  = '— €');
      q('#nADR')     && (q('#nADR').textContent      = '— €');
      q('#nOcc')     && (q('#nOcc').textContent      = '—%');
    }
  }

  /***** Reservierungsliste (+ Statuslogik) *****/
  let page=1, pageSize=50, search='', fHotel='all', fResNo='', fFrom=null, fTo=null, fStatus='active';

  function fillFilters(){
    const sel = q('#filterHotel'); if (!sel) return;
    sel.innerHTML='';
    sel.append(el('option',{value:'all'},'Alle Hotels'));
    HOTELS.forEach(h=> sel.append(el('option',{value:h.code}, displayHotel(h))));
  }

  function uiStatus(row){
    const todayStr = isoDate(soD(new Date()));
    let s = (row.status||'active').toLowerCase();
    if (s==='confirmed') s = 'active';
    const arr = row.arrival ? isoDate(new Date(row.arrival)) : null;
    const dep = row.departure ? isoDate(new Date(row.departure)) : null;
    if (s!=='canceled' && ((dep && dep < todayStr) || (!dep && arr && arr < todayStr))) s = 'done';
    return s;
  }

  async function loadReservations(){
    await autoRollPastToDone();

    const body = q('#resvBody'); if (!body) return;
    body.innerHTML = '';
    const from = (page-1)*pageSize, to = from + pageSize - 1;
    const todayStr = isoDate(soD(new Date()));

    const applyFilters = (query) => {
      if (search)  query = query.ilike('guest_last_name', `%${search}%`);
      if (fResNo)  query = query.ilike('reservation_number', `%${fResNo}%`);
      if (fFrom)   query = query.gte('arrival', fFrom);
      if (fTo)     query = query.lte('arrival', fTo);
      if (fStatus==='active'){
        query = query.gte('arrival', todayStr).neq('status','canceled').or('status.eq.active,status.eq.confirmed,status.is.null');
      } else if (fStatus==='done'){
        query = query.neq('status','canceled').lt('arrival', todayStr);
      } else if (fStatus==='canceled'){
        query = query.eq('status','canceled');
      }
      return query;
    };

    const selectCols = 'id,reservation_number,guest_first_name,guest_last_name,arrival,departure,hotel_name,hotel_code,category,rate_name,rate_price,status,created_at';

    let data = [], count = 0, error = null;

    if (fHotel === 'all'){
      let q1 = supabase.from('reservations').select(selectCols, { count:'exact' })
        .order('arrival', { ascending: true })
        .range(from, to);
      q1 = applyFilters(q1);
      const r = await q1;
      data = r.data || []; count = r.count || 0; error = r.error || null;
    } else {
      let qCode = supabase.from('reservations').select(selectCols).order('arrival',{ascending:true}).range(from,to);
      qCode = applyFilters(qCode.eq('hotel_code', fHotel));
      const r1 = await qCode;

      const needle = HOTEL_KEYWORD[fHotel] || hotelCity(HOTELS.find(h=>h.code===fHotel)?.name || '');
      let qName = supabase.from('reservations').select(selectCols).order('arrival',{ascending:true}).range(from,to);
      qName = applyFilters(qName.ilike('hotel_name', `%${needle}%`));
      const r2 = await qName;

      const map = new Map();
      (r1.data||[]).concat(r2.data||[]).forEach(row => map.set(row.id, row));
      data  = [...map.values()];
      count = data.length;
      error = r1.error || r2.error || null;
    }

    if (error){ q('#pageInfo') && (q('#pageInfo').textContent='Fehler'); console.warn(error); return; }

    data.forEach(row => {
      const rStatus = uiStatus(row);
      const dotCls = rStatus==='canceled'?'dot-canceled':(rStatus==='done'?'dot-done':'dot-active');
      const guest = `${row.guest_last_name||'—'}${row.guest_first_name?', '+row.guest_first_name:''}`;

      const tr = el('tr', { class: 'row', 'data-id': row.id },
        el('td', {}, row.reservation_number || '—'),
        el('td', {}, safeDisplayFromRow(row)),
        el('td', {}, guest),
        el('td', {}, row.arrival ? D2.format(new Date(row.arrival)) : '—'),
        el('td', {}, row.departure ? D2.format(new Date(row.departure)) : '—'),
        el('td', {}, row.category || '—'),
        el('td', {}, row.rate_name || '—'),
        el('td', {}, row.rate_price != null ? EUR.format(row.rate_price) : '—'),
        (()=>{
          const td = el('td',{class:'status'});
          td.append(el('span',{class:`status-dot ${dotCls}`}));
          td.append(document.createTextNode(rStatus));
          return td;
        })()
      );
      tr.addEventListener('click', ()=> openEdit(row.id));
      body.append(tr);
    });

    const totalPages = Math.max(1, Math.ceil((count || 0)/pageSize));
    q('#pageInfo') && (q('#pageInfo').textContent = `Seite ${page} / ${totalPages}`);
  }

  // Filter Events
  q('#searchInput')?.addEventListener('input', (e)=>{ search = e.target.value.trim(); page = 1; loadReservations(); });
  q('#filterHotel')?.addEventListener('change', (e)=>{ fHotel = e.target.value; page=1; loadReservations(); });
  q('#filterResNo')?.addEventListener('input', (e)=>{ fResNo = e.target.value.trim(); page=1; loadReservations(); });
  q('#filterFrom')?.addEventListener('change', (e)=>{ fFrom = e.target.value||null; page=1; loadReservations(); });
  q('#filterTo')  ?.addEventListener('change', (e)=>{ fTo   = e.target.value||null; page=1; loadReservations(); });
  q('#filterStatus')?.addEventListener('change', (e)=>{ fStatus = e.target.value; page=1; loadReservations(); });
  q('#btnRefresh')?.addEventListener('click', async ()=>{ await autoRollPastToDone(); loadReservations(); });
  q('#prevPage')  ?.addEventListener('click', ()=>{ page = Math.max(1, page-1); loadReservations(); });
  q('#nextPage')  ?.addEventListener('click', ()=>{ page = page+1; loadReservations(); });

  /***** Edit: Dropdowns *****/
  function fillEditDropdowns(hotelCode, curCat, curRate){
    const cats = HOTEL_CATEGORIES['default'];
    const rates = HOTEL_RATES['default'];

    const selCat = q('#eCat'); if (selCat) selCat.innerHTML = cats.map(c=>`<option ${c===curCat?'selected':''}>${c}</option>`).join('');
    const selRate= q('#eRate'); if (selRate) selRate.innerHTML= rates.map(r=>`<option value="${r.name}" data-price="${r.price}" ${r.name===curRate?'selected':''}>${r.name} (${EUR.format(r.price)})</option>`).join('');

    selRate?.addEventListener('change', e=>{
      const p = e.target.selectedOptions[0]?.dataset.price;
      if (p) q('#ePrice').value = p;
    });
  }

  /***** Edit-Dialog *****/
  async function openEdit(id){
    const { data, error } = await supabase.from('reservations').select('*').eq('id', id).maybeSingle();
    if (error || !data) return alert('Konnte Reservierung nicht laden.');

    q('#eResNo') && (q('#eResNo').value = data.reservation_number || '');
    q('#eHotel') && (q('#eHotel').value = safeDisplayFromRow(data));
    q('#eLname') && (q('#eLname').value = data.guest_last_name || '');
    q('#eArr') && (q('#eArr').value = data.arrival ? isoDate(new Date(data.arrival)) : '');
    q('#eDep') && (q('#eDep').value = data.departure ? isoDate(new Date(data.departure)) : '');

    const eStatus = q('#eStatus');
    if (eStatus){
      eStatus.value = uiStatus(data);
      eStatus.disabled = true;
    }

    fillEditDropdowns(data.hotel_code, data.category||'', data.rate_name||'');

    q('#ePrice') && (q('#ePrice').value = data.rate_price || 0);
    q('#eNotes') && (q('#eNotes').value = data.notes || '');
    q('#eCcHolder') && (q('#eCcHolder').value = data.cc_holder || '');
    q('#eCcLast4')  && (q('#eCcLast4').value  = data.cc_last4  || '');
    q('#eCcExpM')   && (q('#eCcExpM').value   = data.cc_exp_month || '');
    q('#eCcExpY')   && (q('#eCcExpY').value   = data.cc_exp_year  || '');

    const createdAtTxt = data.created_at ? `Erstellt am ${new Date(data.created_at).toLocaleString('de-DE')}` : '';
    q('#editInfo') && (q('#editInfo').textContent = createdAtTxt);

    q('#btnSaveEdit') && (q('#btnSaveEdit').onclick = async ()=>{
      const payload = {
        guest_last_name: q('#eLname').value || null,
        arrival: q('#eArr').value || null,
        departure: q('#eDep').value || null,
        category: q('#eCat').value || null,
        rate_name: q('#eRate').value || null,
        rate_price: Number(q('#ePrice').value||0),
        notes: q('#eNotes').value || null
      };
      const { error } = await supabase.from('reservations').update(payload).eq('id', id);
      q('#editInfo').textContent = error ? ('Fehler: '+error.message) : createdAtTxt;
      await autoRollPastToDone(); await loadReservations();
    });

    q('#btnSavePay') && (q('#btnSavePay').onclick = async ()=>{
      const payload = {
        cc_holder: q('#eCcHolder').value || null,
        cc_last4:  q('#eCcLast4').value  || null,
        cc_exp_month: q('#eCcExpM').value ? Number(q('#eCcExpM').value) : null,
        cc_exp_year:  q('#eCcExpY').value ? Number(q('#eCcExpY').value) : null
      };
      const { error } = await supabase.from('reservations').update(payload).eq('id', id);
      q('#editInfo').textContent = error ? ('Fehler: '+error.message) : createdAtTxt;
    });

    q('#btnCancelRes') && (q('#btnCancelRes').onclick = async ()=>{
      const { error } = await supabase.from('reservations').update({ status:'canceled', canceled_at: new Date().toISOString() }).eq('id', id);
      q('#editInfo').textContent = error ? ('Fehler: '+error.message) : createdAtTxt;
      await loadReservations();
    });

    qa('.tab').forEach(b=>b.classList.remove('active')); q('.tab[data-tab="tabDet"]')?.classList.add('active');
    qa('.tabpage').forEach(p=>p.classList.add('hidden')); q('#tabDet')?.classList.remove('hidden');
    openModal('modalEdit');
  }

  qa('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      qa('.tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
      qa('.tabpage').forEach(p=>p.classList.add('hidden'));
      q('#'+btn.dataset.tab)?.classList.remove('hidden');
    });
  });

  /***** Wizard *****/
  function ensureCatRateOptions(){
    const cats  = HOTEL_CATEGORIES['default'];
    const rates = HOTEL_RATES['default'];
    const selCat  = q('#newCat');
    const selRate = q('#newRate');

    if (selCat && !selCat.options.length){
      selCat.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
      selCat.value = cats[0];
    }
    if (selRate && !selRate.options.length){
      selRate.innerHTML = rates.map(r => `<option value="${r.name}" data-price="${r.price}">${r.name} (${EUR.format(r.price)})</option>`).join('');
      selRate.value = rates[0].name;
      q('#newPrice') && (q('#newPrice').value = rates[0].price);
    }
  }

  function wizardSet(step){
    qa('.wstep').forEach(b=>b.classList.toggle('active', b.dataset.step==step));
    qa('.wpage').forEach(p=>p.classList.add('hidden'));
    q('#w'+step)?.classList.remove('hidden');
    q('#btnPrev')?.classList.toggle('hidden', step==='1');
    q('#btnNext')?.classList.toggle('hidden', step==='4');
    q('#btnCreate')?.classList.toggle('hidden', step!=='4');

    // Wenn in Step 2/3 → sicherstellen, dass Optionen + Bilder gesetzt sind
    if (step==='2' || step==='3'){
      ensureCatRateOptions();
      setCatImage(SKETCH_IMG_SRC); // kleine Preview nie "broken"
    }
    if (step==='1'){
      setHotelImage(HOTEL_IMG_SRC);
    }

    validateStep(step);
    if (step==='4') updateSummary('#summaryFinal');
  }
  qa('.wstep').forEach(s=> s.style.pointerEvents='none');

  function validateStep(step){
    let ok=false;
    if (step==='1'){ ok = !!q('#newHotel')?.value && !!q('#newArr')?.value && !!q('#newDep')?.value; }
    else if (step==='2'){ ok = !!q('#newCat')?.value; }
    else if (step==='3'){ ok = !!q('#newRate')?.value && Number(q('#newPrice')?.value||0) > 0; }
    else if (step==='4'){ ok = true; } // Gastdaten dürfen hier ergänzt werden, Pflicht in DB ist Nachname
    q('#btnNext') && (q('#btnNext').disabled = (!ok && step!=='4'));
    return ok;
  }

  function fillHotelSelect(){
    const sel=q('#newHotel'); if (!sel) return;
    sel.innerHTML='';
    sel.append(el('option',{value:''},'Bitte wählen'));
    HOTELS.forEach(h=> sel.append(el('option',{value:h.code}, displayHotel(h))));

    sel.addEventListener('change', ()=>{
      const cats  = HOTEL_CATEGORIES['default'];
      const rates = HOTEL_RATES['default'];

      // Kategorien + Raten setzen
      q('#newCat')  && (q('#newCat').innerHTML  = cats.map((c,i)=>`<option value="${c}" ${i===0?'selected':''}>${c}</option>`).join(''));
      q('#newRate') && (q('#newRate').innerHTML = rates.map((r,i)=>`<option value="${r.name}" data-price="${r.price}" ${i===0?'selected':''}>${r.name} (${EUR.format(r.price)})</option>`).join(''));
      q('#newPrice') && (q('#newPrice').value = rates[0].price);

      // Bilder
      setHotelImage(HOTEL_IMG_SRC);
      setCatImage(SKETCH_IMG_SRC);

      validateStep('1'); updateSummary('#summaryFinal');
    });
  }

  // Wizard Buttons
  q('#btnPrev')?.addEventListener('click', ()=>{
    const cur = Number(qa('.wstep.active')[0].dataset.step);
    wizardSet(String(Math.max(1,cur-1)));
  });
  q('#btnNext')?.addEventListener('click', ()=>{
    const cur = String(qa('.wstep.active')[0].dataset.step);
    if (!validateStep(cur)){ q('#newInfo') && (q('#newInfo').textContent='Bitte Pflichtfelder ausfüllen.'); return; }
    const next = String(Math.min(4, Number(cur)+1));
    wizardSet(next);
  });

  // Inputs → Live-Validation + Summary
  q('#newRate')?.addEventListener('change', e=>{
    const price=e.target.selectedOptions[0]?.dataset.price;
    if(price && q('#newPrice')) q('#newPrice').value=price;
    validateStep('3'); updateSummary('#summaryFinal');
  });
  ['newArr','newDep','newAdults','newChildren','newHotel'].forEach(id=>{
    const n=q('#'+id); n?.addEventListener('input', ()=>{ validateStep('1'); updateSummary('#summaryFinal'); });
  });
  q('#newCat')  ?.addEventListener('change', ()=>{ validateStep('2'); updateSummary('#summaryFinal'); setCatImage(SKETCH_IMG_SRC); });
  q('#newPrice')?.addEventListener('input',  ()=>{ validateStep('3'); updateSummary('#summaryFinal'); });

  /* Summary */
  function linesSummary(){
    const code=q('#newHotel')?.value; const h=HOTELS.find(x=>x.code===code);
    const adults = Number(q('#newAdults')?.value||1), children = Number(q('#newChildren')?.value||0);
    return [
      ['Hotel', h ? displayHotel(h) : '—'],
      ['Zeitraum', (q('#newArr')?.value||'—') + ' → ' + (q('#newDep')?.value||'—')],
      ['Belegung', `${adults} Erw. / ${children} Kind.`],
      ['Kategorie', q('#newCat')?.value||'—'],
      ['Rate', q('#newRate')?.value||'—'],
      ['Preis', q('#newPrice')?.value?EUR.format(q('#newPrice').value):'—']
    ];
  }
  function updateSummary(selector='#summaryFinal'){
    const box = q(selector); if (!box) return;
    const rows = linesSummary().map(([k,v])=>`<div class="summary line"><span>${k}</span><span>${v}</span></div>`).join('');
    box.innerHTML = `<h4 class="mono">Zusammenfassung</h4>${rows}`;
  }

  /* Live Credit-Card mirroring */
  ;['ccHolder','ccNumber','ccExpiry'].forEach(id=>{
    const map = {ccHolder:'ccHolderLive',ccNumber:'ccNumLive',ccExpiry:'ccExpLive'};
    const fmtNum = v => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim().padEnd(19,'•');
    const node = q('#'+id);
    node?.addEventListener('input', e=>{
      const v = e.target.value;
      if (id==='ccNumber') q('#'+map[id]).textContent = fmtNum(v);
      else q('#'+map[id]).textContent = v || (id==='ccExpiry'?'MM/YY':'NAME');
    });
  });

  /* Reservierung anlegen */
  function parseCc(){
    const num = (q('#ccNumber')?.value || '').replace(/\D/g,'');
    const last4 = num.slice(-4) || null;
    const holder= q('#ccHolder')?.value || null;
    const exp   = q('#ccExpiry')?.value || '';
    const m = exp.match(/^(\d{1,2})\s*\/\s*(\d{2})$/);
    const exp_m = m ? Number(m[1]) : null;
    const exp_y = m ? Number(m[2]) : null;
    return { last4, holder, exp_m, exp_y };
  }
  function genResNo(){ return 'R' + Date.now().toString(36).toUpperCase(); }
  async function createReservation(){
    if (!validateStep('4')){ q('#newInfo') && (q('#newInfo').textContent='Bitte Pflichtfelder ausfüllen.'); return; }
    const code = q('#newHotel')?.value;
    const hUI  = HOTELS.find(h=>h.code===code);

    const adults   = Number(q('#newAdults')?.value||1);
    const children = Number(q('#newChildren')?.value||0);
    const guests   = adults + children;
    const cc = parseCc();

    const payload = {
      reservation_number: genResNo(),
      status: 'active',
      hotel_code: code || null,
      hotel_name: (hUI ? displayHotel(hUI) : (code||null)),
      arrival: q('#newArr')?.value || null,
      departure: q('#newDep')?.value || null,
      guests,
      guests_adults: adults,
      guests_children: children,
      category: q('#newCat')?.value || null,
      rate_name: q('#newRate')?.value || null,
      rate_price: Number(q('#newPrice')?.value||0),
      guest_first_name: q('#newFname')?.value || null,
      guest_last_name: q('#newLname')?.value || null,
      guest_email: q('#newEmail')?.value || null,
      guest_phone: q('#newPhone')?.value || null,
      guest_street: q('#newStreet')?.value || null,
      guest_postal_code: q('#newZip')?.value || null,
      guest_city: q('#newCity')?.value || null,
      company_name: q('#newCompany')?.value || null,
      company_vat: q('#newVat')?.value || null,
      company_postal_code: q('#newCompanyZip')?.value || null,
      company_address: q('#newAddress')?.value || null,
      cc_holder: cc.holder,
      cc_last4: cc.last4,
      cc_exp_month: cc.exp_m,
      cc_exp_year: cc.exp_y,
      channel: 'Direct',
      notes: q('#newNotes')?.value || null
    };

    const { error } = await supabase.from('reservations').insert(payload);
    q('#newInfo') && (q('#newInfo').textContent = error ? ('Fehler: ' + error.message) : 'Reservierung gespeichert.');
    if (!error){
      await autoRollPastToDone();
      await loadKpisToday();
      await loadKpisNext();
      await loadReservations();
      setTimeout(()=>closeModal('modalNew'), 700);
    }
  }
  q('#btnCreate')?.addEventListener('click', createReservation);

  /***** Availability *****/
  function datesFrom(startDate, days){
    const ds=[]; const base = startDate? new Date(startDate) : soD(new Date());
    base.setHours(0,0,0,0);
    for(let i=0;i<days;i++){ const d=new Date(base); d.setDate(base.getDate()+i); ds.push(d); }
    return ds;
  }
  function occClass(p){ if (p>=90) return 'occ-r'; if (p>=65) return 'occ-o'; return 'occ-g'; }
  async function buildMatrix(){
    const fromVal = q('#availFrom')?.value || isoDate(new Date());
    const days = Number(q('#availDays')?.value||14);
    const ds = datesFrom(fromVal, days);

    const head=q('#matrixTable thead tr'); head?.querySelectorAll('th:not(.sticky)')?.forEach(n=>n.remove());
    ds.forEach(d=> head?.append(el('th',{}, Dm.format(d))));
    const body=q('#matrixBody'); if (!body) return; body.innerHTML='';

    const from = isoDate(ds[0]), to = isoDate(ds.at(-1));

    for (const h of HOTELS){
      const tr=el('tr'); tr.append(el('td',{class:'sticky'}, displayHotel(h)));
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
  q('#availRun')?.addEventListener('click', buildMatrix);

  /***** Reporting *****/
  function setDefaultReportRange(){
    const to=soD(new Date()); const from=soD(new Date(Date.now()-29*86400000));
    q('#repFrom') && (q('#repFrom').value=isoDate(from));
    q('#repTo')   && (q('#repTo').value=isoDate(to));
  }
  function fillRepHotel(){
    const sel=q('#repHotel'); if (!sel) return;
    sel.innerHTML='';
    sel.append(el('option',{value:'all'},'Alle Hotels'));
    HOTELS.forEach(h=> sel.append(el('option',{value:h.code}, displayHotel(h))));
  }
  async function runReport(){
    const from=q('#repFrom')?.value, to=q('#repTo')?.value, code=q('#repHotel')?.value || 'all';
    if (!from || !to){ return; }
    let query = supabase.from('reservations').select('hotel_name,hotel_code,rate_price,arrival,channel,status')
      .gte('arrival', from).lte('arrival', to).neq('status','canceled');
    if (code!=='all'){ query = query.eq('hotel_code', code); }
    const { data, error } = await query;
    const body=q('#repBody'); if (!body) return; body.innerHTML='';
    if (error){ body.append(el('tr',{}, el('td',{colspan:'5'}, 'Fehler beim Laden'))); return; }
    const byHotel=new Map();
    (data||[]).forEach(r=>{
      const k=r.hotel_name || r.hotel_code || '—';
      const o=byHotel.get(k)||{bookings:0,revenue:0,ota:0};
      o.bookings++; o.revenue+=Number(r.rate_price||0);
      if ((r.channel||'').toLowerCase()==='ota') o.ota++;
      byHotel.set(k,o);
    });
    if (byHotel.size===0){ body.append(el('tr',{}, el('td',{colspan:'5'}, 'Keine Daten im Zeitraum'))); return; }
    [...byHotel.entries()].sort((a,b)=>b[1].revenue-a[1].revenue).forEach(([hotel,o])=>{
      const adr=o.bookings?o.revenue/o.bookings:null;
      const otaShare = o.bookings? Math.round(o.ota/o.bookings*100):0;
      body.append(el('tr',{},
        el('td',{},hotel),
        el('td',{},String(o.bookings)),
        el('td',{},EUR.format(o.revenue)),
        el('td',{}, adr!=null?EUR.format(adr):'—'),
        el('td',{}, otaShare+'%')
      ));
    });
  }
  q('#repRun')?.addEventListener('click', runReport);
  q('#repCsv')?.addEventListener('click', ()=>{
    const tbody = qa('#repBody tr'); const rows = [['Hotel','Buchungen','Umsatz','ADR','OTA-Anteil']];
    tbody.forEach(tr=> rows.push([...tr.children].map(td=>td.textContent)));
    download('report.csv','text/csv;charset=utf-8', rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n'));
  });
  q('#repXls')?.addEventListener('click', ()=>{
    const tbody = qa('#repBody tr'); const rows = [['Hotel','Buchungen','Umsatz','ADR','OTA-Anteil']];
    tbody.forEach(tr=> rows.push([...tr.children].map(td=>td.textContent)));
    const header=`<?xml version="1.0"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      <Worksheet ss:Name="Report"><Table>`;
    const rowsXml = rows.map(r=>`<Row>`+r.map(c=>`<Cell><Data ss:Type="String">${String(c??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</Data></Cell>`).join('')+`</Row>`).join('');
    const xls = header+rowsXml+`</Table></Worksheet></Workbook>`;
    download('report.xls','application/vnd.ms-excel', xls);
  });

  /***** Skizze *****/
  function buildSketch(){
    // Neuer 2-Zustände-View
    const list = q('#sketchStateList');
    const view = q('#sketchStateView');
    const back = q('#sketchBack');
    const label= q('#sketchHotelLabel');

    if (list && view){
      list.innerHTML = '';
      list.classList.remove('hidden');
      view.classList.add('hidden');

      HOTELS.forEach(h=>{
        const btn = el('button',{class:'btn'}, displayHotel(h));
        btn.addEventListener('click', ()=>{
          if (label) label.textContent = displayHotel(h);
          setSketchImage(SKETCH_IMG_SRC);
          list.classList.add('hidden');
          view.classList.remove('hidden');
        });
        list.append(btn);
      });

      if (back){
        back.onclick = ()=>{ view.classList.add('hidden'); list.classList.remove('hidden'); };
      }
      return;
    }

    // Fallback: einfache Grid-Liste
    const grid = q('#sketchGrid');
    if (grid){
      grid.innerHTML = '';
      HOTELS.forEach(h=>{
        grid.append(el('div',{class:'hotel-card'},
          el('div',{class:'muted'}, h.group),
          el('div',{}, displayHotel(h)),
          el('div',{class:'code'}, h.code)
        ));
      });
    }
  }

  /***** EVENTS & INIT *****/
  q('#btnAvail')?.addEventListener('click', async ()=>{
    q('#availFrom') && (q('#availFrom').value = isoDate(new Date()));
    q('#availDays') && (q('#availDays').value = '14');
    await buildMatrix();
    openModal('modalAvail');
  });
  q('#btnReporting')?.addEventListener('click', async ()=>{
    setDefaultReportRange(); fillRepHotel(); await runReport(); openModal('modalReporting');
  });
  q('#btnSettings')?.addEventListener('click', ()=> openModal('modalSettings'));
  q('#btnSketch')?.addEventListener('click', ()=>{ buildSketch(); openModal('modalSketch'); });

  q('#btnNew')?.addEventListener('click', ()=>{
    // Reset
    ['newArr','newDep','newAdults','newChildren','newCat','newRate','newPrice','newFname','newLname','newEmail','newPhone','newStreet','newZip','newCity','newCompany','newVat','newCompanyZip','newAddress','newNotes','ccHolder','ccNumber','ccExpiry']
      .forEach(id=>{ const n=q('#'+id); if(n){ n.value=''; } });
    q('#newAdults') && (q('#newAdults').value=1);
    q('#newChildren') && (q('#newChildren').value=0);
    q('#btnNext') && (q('#btnNext').disabled=true);

    // Live-Card reset
    q('#ccNumLive')    && (q('#ccNumLive').textContent='•••• •••• •••• ••••');
    q('#ccHolderLive') && (q('#ccHolderLive').textContent='NAME');
    q('#ccExpLive')    && (q('#ccExpLive').textContent='MM/YY');

    // Selects + Bilder
    fillHotelSelect();
    ensureCatRateOptions();
    setHotelImage(HOTEL_IMG_SRC);
    setCatImage(SKETCH_IMG_SRC);

    wizardSet('1');
    q('#newInfo') && (q('#newInfo').textContent='');
    openModal('modalNew');
  });

  (async function init(){
    startClocks();
    await refreshStatus(); setInterval(refreshStatus, 30000);
    await autoRollPastToDone();
    await buildMiniAnalytics();

    fillHotelFilter(q('#kpiFilterToday'));
    fillHotelFilter(q('#kpiFilterNext'));
    q('#kpiFilterToday')?.addEventListener('change', loadKpisToday);
    q('#kpiFilterNext')?.addEventListener('change', loadKpisNext);

    fillFilters();
    if (q('#filterStatus')) q('#filterStatus').value = 'active';

    await loadKpisToday();
    await loadKpisNext();
    await loadReservations();
  })();

  // ===== Hilfsfunktion aus Liste (wegen Scope) =====
  function safeDisplayFromRow(row){
    const h = HOTELS.find(x=>x.code===row.hotel_code);
    if (h) return displayHotel(h);
    const raw = String(row.hotel_name||'').replace(/^[\s·•\-–—]+/,'').trim();
    if (!raw) return row.hotel_code || '—';
    for (const p of BRAND_PREFIXES){
      if (raw.startsWith(p+' ')) return `${p} - ${raw.slice(p.length+1)}`;
    }
    return raw;
  }
})();
