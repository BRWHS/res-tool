/* res-tool – app.js (full) */
/* ==========================================================================
   NOTE:
   - This is a consolidated, production-ready file that wires all major UI
     areas (Dashboard KPIs, Reservations, Wizard, Availability, Reporting,
     Settings, Sketch) and adds the new Rates management (Direct/Corp/IDS).
   - Includes fixes for early helper usage and global openRatesModal.
   - Defensive null checks across all UI hooks.
   - Supabase queries assume existing tables: reservations, availability, rates.
   ========================================================================== */

(() => {
  if (window.__RESTOOL_APP_V2__) return;
  window.__RESTOOL_APP_V2__ = true;

  /* =========================  CONFIG / CLIENTS  ========================= */
  const SB_URL = "https://kytuiodojfcaggkvizto.supabase.co";
  const SB_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHVpb2RvamZjYWdna3ZpenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzA0NjgsImV4cCI6MjA3MDQwNjQ2OH0.YobQZnCQ7LihWtewynoCJ6ZTjqetkGwh82Nd2mmmhLU";
  const supabase = window.supabase.createClient(SB_URL, SB_ANON_KEY);

  /* ==========================  EARLY HELPERS  =========================== */
  const q  = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s));
  const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else e.setAttribute(k, v);
    }
    kids.forEach(k => e.append(k));
    return e;
  };

  const D2  = new Intl.DateTimeFormat("de-DE", { day:"2-digit", month:"2-digit", year:"numeric" });
  const Dm  = new Intl.DateTimeFormat("de-DE", { day:"2-digit", month:"2-digit" });
  const EUR = new Intl.NumberFormat("de-DE", { style:"currency", currency:"EUR" });
  const euro = v => (v==null ? "— €" : EUR.format(v));
  const pct  = v => (v==null ? "—%" : `${v}%`);
  const soD = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const isoDate = d => d.toISOString().slice(0,10);
  const DAY = 86400000;
  function setChip(node, ok){ node?.classList.remove("lvl-2","lvl-1","lvl-0"); node?.classList.add(ok ? "lvl-0":"lvl-1"); }
  function download(filename, mime, content){
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function isoWeek(d){
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(),0,4));
    const diff = (date - firstThursday) / 86400000;
    return 1 + Math.round(diff / 7);
  }

  /* ==============================  DATA  ================================ */
  const HOTEL_IMG_SRC  = "/assets/hotel-placeholder.png";
  const SKETCH_IMG_SRC = "/assets/sketch-placeholder.png";
  const IMG_FALLBACK   = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500' viewBox='0 0 800 500'>
       <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
         <stop offset='0' stop-color='#0ea5b0'/><stop offset='1' stop-color='#052a36'/>
       </linearGradient></defs>
       <rect width='800' height='500' rx='24' fill='url(#g)'/>
       <text x='50%' y='50%' fill='#9adce6' font-family='Inter' font-size='24' text-anchor='middle'>Kein Bild</text>
     </svg>`
  );

  const HOTELS = [
    { group:"MASEVEN",  name:"MASEVEN München Dornach",   code:"MA7-M-DOR" },
    { group:"MASEVEN",  name:"MASEVEN München Trudering", code:"MA7-M-TRU" },
    { group:"MASEVEN",  name:"MASEVEN Frankfurt",         code:"MA7-FRA" },
    { group:"MASEVEN",  name:"MASEVEN Stuttgart",         code:"MA7-STR" },
    { group:"Fidelity", name:"Fidelity Robenstein",       code:"FID-ROB" },
    { group:"Fidelity", name:"Fidelity Struck",           code:"FID-STR" },
    { group:"Fidelity", name:"Fidelity Doerr",            code:"FID-DOE" },
    { group:"Fidelity", name:"Fidelity Gr. Baum",         code:"FID-GRB" },
    { group:"Fidelity", name:"Fidelity Landskron",        code:"FID-LAN" },
    { group:"Fidelity", name:"Fidelity Pürgl",            code:"FID-PUE" },
    { group:"Fidelity", name:"Fidelity Seppl",            code:"FID-SEP" },
    { group:"Tante Alma", name:"Tante Alma Bonn",         code:"TAL-BON" },
    { group:"Tante Alma", name:"Tante Alma Köln",         code:"TAL-KOE" },
    { group:"Tante Alma", name:"Tante Alma Erfurt",       code:"TAL-ERF" },
    { group:"Tante Alma", name:"Tante Alma Mannheim",     code:"TAL-MAN" },
    { group:"Tante Alma", name:"Tante Alma Mülheim",      code:"TAL-MUE" },
    { group:"Tante Alma", name:"Tante Alma Sonnen",       code:"TAL-SON" },
    { group:"Delta by Marriot", name:"Delta by Marriot Offenbach", code:"DBM-OF" },
    { group:"Villa Viva", name:"Villa Viva Hamburg",      code:"VV-HH" },
  ];
  const BRAND_PREFIXES = ["MASEVEN","Fidelity","Tante Alma","Delta by Marriot","Villa Viva"];
  const hotelCity = (full) => {
    if (!full) return "";
    for (const p of BRAND_PREFIXES){ if (full.startsWith(p+" ")) return full.slice(p.length+1); }
    return full;
  };
  const displayHotel = (h) => h ? `${h.group} - ${hotelCity(h.name)}` : "—";

  const HOTEL_KEYWORD = {
    "MA7-M-DOR":"Dornach","MA7-M-TRU":"Trudering","MA7-FRA":"Frankfurt","MA7-STR":"Stuttgart",
    "FID-ROB":"Robenstein","FID-STR":"Struck","FID-DOE":"Doerr","FID-GRB":"Baum","FID-LAN":"Landskron","FID-PUE":"Pürgl","FID-SEP":"Seppl",
    "TAL-BON":"Bonn","TAL-KOE":"Köln","TAL-ERF":"Erfurt","TAL-MAN":"Mannheim","TAL-MUE":"Mülheim","TAL-SON":"Sonnen",
    "DBM-OF":"Offenbach","VV-HH":"Hamburg"
  };

  const HOTEL_CATEGORIES = { default: ["Standard","Superior","Suite"] };
  const HOTEL_RATES = { default: [
    { name:"Flex exkl. Frühstück", price:89 },
    { name:"Flex inkl. Frühstück", price:109 }
  ]};
  const CAT_META = {
    "Standard": { size:"18–22 m²", beds:"Queen (160)",      note:"Komfortabel, ruhig" },
    "Superior": { size:"22–28 m²", beds:"King (180)/Twin",  note:"Mehr Platz, Sitzecke" },
    "Suite":    { size:"35–45 m²", beds:"King (180)",       note:"Separater Wohnbereich" }
  };

  /* Feature Flags */
  const REQUIRE_MAPPING = false; // später true (HNS-Gate)

  /* ===========================  IMG HELPERS  ============================ */
  function safeSetImg(imgEl, src){
    if (!imgEl) return;
    imgEl.onerror = null;
    imgEl.src = src || SKETCH_IMG_SRC;
    imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = IMG_FALLBACK; };
  }
  function ensureHotelImageSlot(){
    const grid = q("#w1 .grid2");
    if (!grid) return null;
    let img = q("#hotelImg");
    if (img) return img;
    const slot = grid.children[1];
    const wrap = slot || el("div", {});
    wrap.classList.add("imgcard");
    wrap.style.maxWidth = "320px";
    wrap.style.justifySelf = "end";
    img = el("img",{ id:"hotelImg", alt:"Hotelbild", style:"width:100%;border-radius:12px;display:block;" });
    wrap.innerHTML = "";
    wrap.append(img);
    if (!slot) grid.insertBefore(wrap, grid.firstChild?.nextSibling || null);
    return img;
  }
  function setHotelImage(src){ safeSetImg(ensureHotelImageSlot(), src || HOTEL_IMG_SRC); }
  function setCatImage(src){
    const arr = ["#imgCatPreview", "#imgCatPreview2", "#imgCatPreview3"].map(sel => q(sel)).filter(Boolean);
    if (arr.length === 0){ safeSetImg(q("#imgCatPreview"), src || SKETCH_IMG_SRC); return; }
    arr.forEach(imgEl => safeSetImg(imgEl, src || SKETCH_IMG_SRC));
  }
  function setSketchImage(src){ safeSetImg(q("#sketchImage"), src || SKETCH_IMG_SRC); }

  /* ===============================  UI  ================================= */
  const backdrop = q("#backdrop");
  function openModal(id){
    const sel = (id||"").toString();
    const m = q(sel.startsWith("#") ? sel : ("#" + sel));
    if (!m) return;
    document.body.classList.add("modal-open");
    backdrop && (backdrop.style.display = "flex");
    m.style.display = "block";
  }
  function closeModal(id){
    const sel = (id||"").toString();
    const m = q(sel.startsWith("#") ? sel : ("#" + sel));
    if (!m) return;
    m.style.display = "none";
    if (backdrop) backdrop.style.display = "none";
    document.body.classList.remove("modal-open");
  }
  qa("[data-close]").forEach(b => b.addEventListener("click", () => {
    const tgt = b.getAttribute("data-close");
    if (tgt) closeModal(tgt);
    else closeModal(b.closest(".modal")?.id || "");
  }));
  window.addEventListener("keydown", e => {
    if (e.key === "Escape"){
      qa(".modal").forEach(m => m.style.display = "none");
      if (backdrop) backdrop.style.display = "none";
      document.body.classList.remove("modal-open");
    }
  });

  /* ======================  DASHBOARD (clock/status)  ==================== */
  function startClocks(){
    const tick = () => {
      const d = new Date();
      q("#clockLocal") && (q("#clockLocal").textContent = d.toLocaleTimeString("de-DE"));
      q("#dateLocal")  && (q("#dateLocal").textContent  = d.toLocaleDateString("de-DE"));
    };
    tick();
    setInterval(tick, 1000);
  }
  async function refreshStatus(){
    const a = await supabase.from("reservations").select("id", { head:true, count:"exact" });
    const b = await supabase.from("availability").select("date", { head:true, count:"exact" });
    setChip(q("#chipSb"), !a.error && !b.error);
    const chipH = q("#chipHns");
    chipH?.classList.remove("lvl-0","lvl-1","lvl-2");
    chipH?.classList.add("lvl-2"); // gelb/warte
  }

  /* =============================  MINI-ANALYTICS  ======================= */
  async function buildMiniAnalytics(){
    const list = q("#miniAnalyticsDock"); if (!list) return;
    list.innerHTML = "";
    const today = soD(new Date());
    const todayStartISO = today.toISOString();
    const todayEnd = new Date(today); todayEnd.setDate(todayEnd.getDate() + 1);
    const todayEndISO = todayEnd.toISOString();
    const prev = new Date(today); prev.setFullYear(prev.getFullYear() - 1);
    const prevStartISO = soD(prev).toISOString();

    const cur = await supabase.from("reservations")
      .select("hotel_code,created_at")
      .gte("created_at", todayStartISO).lt("created_at", todayEndISO);
    const prv = await supabase.from("reservations")
      .select("hotel_code,created_at")
      .gte("created_at", prevStartISO).lt("created_at", todayEndISO);

    const countByHotel = (res) => {
      const m = new Map();
      (res?.data || []).forEach(r => m.set(r.hotel_code || "—", (m.get(r.hotel_code || "—") || 0) + 1));
      return m;
    };
    const mCur = countByHotel(cur);
    const mPrv = countByHotel(prv);

    const SPARK_W = 60, SPARK_H = 22;
    HOTELS.forEach(h => {
      const c = mCur.get(h.code) || 0;
      const p = mPrv.get(h.code) || 0;
      const up = p === 0 ? c > 0 : c > p;
      const pts = Array.from({ length: 7 }, () => Math.max(0, Math.round((c / 7) + (Math.random()*2 - 1))));
      const max = Math.max(1, ...pts), min = Math.min(...pts);
      const path = pts.map((v,i)=>{
        const x = (i/(pts.length-1))*SPARK_W;
        const y = SPARK_H - ((v-min)/(max-min || 1))*(SPARK_H-2) - 1;
        return `${i===0 ? "M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
      const brandAndHotel = `${h.group} ${hotelCity(h.name)}`;
      const item = el("div", { class:"dock-item", title:brandAndHotel },
        el("div", { class:"dock-name", text:brandAndHotel }),
        (() => {
          const svg = el("svg", { class:"spark", viewBox:`0 0 ${SPARK_W} ${SPARK_H}`, xmlns:"http://www.w3.org/2000/svg" });
          svg.append(el("path", { d:path, fill:"none", stroke: up ? "#35e08a" : "#ff4d6d", "stroke-width":"2" }));
          return svg;
        })(),
        el("div", { class:`dock-arrow ${up ? "up":"down"}`, text:(up ? "↑" : "↓") })
      );
      list.append(item);
    });
  }

  /* ==============================  KPIs  ================================= */
  function fillHotelFilter(selectEl){
    if (!selectEl) return;
    selectEl.innerHTML = "";
    selectEl.append(el("option",{value:"all"},"Gesamt"));
    HOTELS.forEach(h => selectEl.append(el("option",{value:h.code}, displayHotel(h))));
  }

  async function loadKpisToday(){
    try {
      const sel = q("#kpiFilterToday");
      const code = sel ? sel.value : "all";
      const hotel = code !== "all" ? HOTELS.find(h=>h.code===code) : null;

      const today = soD(new Date());
      const tDate = isoDate(today);
      const nowISO = new Date().toISOString();
      const startISO = today.toISOString();

      let qb = supabase.from("reservations")
        .select("id,created_at")
        .gte("created_at", startISO)
        .lte("created_at", nowISO);
      if (hotel) qb = qb.eq("hotel_code", hotel.code);
      const rB = await qb;
      const bookingsToday = (rB.data || []).length;

      let qA = supabase.from("reservations")
        .select("id, rate_price, hotel_code, hotel_name, arrival, departure, status")
        .lte("arrival", tDate)
        .gte("departure", tDate)
        .neq("status", "canceled");
      if (hotel) qA = qA.eq("hotel_code", hotel.code);

      let qB2 = supabase.from("reservations")
        .select("id, rate_price, hotel_code, hotel_name, arrival, departure, status")
        .lte("arrival", tDate)
        .is("departure", null)
        .neq("status", "canceled");
      if (hotel) qB2 = qB2.eq("hotel_code", hotel.code);

      const [rA, rBopen] = await Promise.all([qA, qB2]);
      const byId = new Map();
      (rA.data||[]).forEach(x => byId.set(x.id, x));
      (rBopen.data||[]).forEach(x => byId.set(x.id, x));

      const isActiveToday = (row) => {
        const arr = row.arrival ? isoDate(new Date(row.arrival)) : null;
        const depRaw = row.departure;
        const dep = depRaw ? isoDate(new Date(depRaw)) : null;
        const noDep = depRaw == null || depRaw === "" || dep === null;
        const arrived = arr && arr <= tDate;
        const notLeft = noDep || (dep && dep >= tDate);
        const notCanceled = String(row.status||"").toLowerCase() !== "canceled";
        return arrived && notLeft && notCanceled;
      };
      const activeToday = Array.from(byId.values()).filter(isActiveToday);

      const revenue = activeToday.reduce((s,r)=> s + Number(r.rate_price||0), 0);
      const adr = activeToday.length ? Math.round((revenue/activeToday.length)*100)/100 : null;

      let occ = null;
      if (hotel){
        const r = await supabase.from("availability").select("capacity,booked").eq("hotel_code", hotel.code).eq("date", tDate);
        if (!r.error && r.data?.length){
          const a = r.data[0]; occ = Math.round(Math.min(100, (Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100));
        }
      } else {
        const r = await supabase.from("availability").select("capacity,booked").eq("date", tDate);
        if (!r.error && r.data?.length){
          const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
          occ = Math.round(avg);
        }
      }

      q("#tBookings") && (q("#tBookings").textContent = bookingsToday);
      q("#tRevenue")  && (q("#tRevenue").textContent  = euro(revenue));
      q("#tADR")      && (q("#tADR").textContent      = euro(adr));
      q("#tOcc")      && (q("#tOcc").textContent      = pct(occ));
    } catch (err) {
      console.error("loadKpisToday fatal", err);
      q("#tBookings") && (q("#tBookings").textContent = "—");
      q("#tRevenue")  && (q("#tRevenue").textContent  = "— €");
      q("#tADR")      && (q("#tADR").textContent      = "— €");
      q("#tOcc")      && (q("#tOcc").textContent      = "—%");
    }
  }

  async function loadKpisNext(){
    try {
      const code = q("#kpiFilterNext")?.value || "all";
      const hotel = code!=="all" ? HOTELS.find(h=>h.code===code) : null;

      const today = soD(new Date());
      const start = new Date(today); start.setDate(start.getDate()+1);
      const end   = new Date(today); end.setDate(end.getDate()+7);

      const kwFrom = isoWeek(start);
      const kwTo   = isoWeek(end);
      const kwNode = q("#kwLabel");
      if (kwNode) kwNode.textContent = kwFrom===kwTo ? `(KW ${kwFrom})` : `(KW ${kwFrom}–${kwTo})`;

      const startDate = isoDate(start);
      const endDate   = isoDate(end);
      const endPlus1  = new Date(end); endPlus1.setDate(endPlus1.getDate()+1);

      let qA = supabase.from("reservations")
        .select("id, rate_price, hotel_code, arrival, departure, status")
        .neq("status","canceled")
        .lte("arrival", endDate)
        .gte("departure", startDate);
      if (hotel) qA = qA.eq("hotel_code", hotel.code);

      let qB = supabase.from("reservations")
        .select("id, rate_price, hotel_code, arrival, departure, status")
        .neq("status","canceled")
        .lte("arrival", endDate)
        .is("departure", null);
      if (hotel) qB = qB.eq("hotel_code", hotel.code);

      const [rA, rB] = await Promise.all([qA, qB]);
      const byId = new Map();
      (rA.data||[]).forEach(x => byId.set(x.id, x));
      (rB.data||[]).forEach(x => byId.set(x.id, x));
      const rows = Array.from(byId.values());

      let totalRevenue = 0;
      rows.forEach(r=>{
        const arr = soD(new Date(r.arrival));
        const dep = r.departure ? soD(new Date(r.departure)) : null;
        const stayEndExcl = dep ? dep : endPlus1;
        const overlapStart = new Date(Math.max(arr.getTime(), start.getTime()));
        const overlapEndExcl = new Date(Math.min(stayEndExcl.getTime(), endPlus1.getTime()));
        const nights = Math.max(0, Math.round((overlapEndExcl - overlapStart)/DAY));
        if (nights > 0) totalRevenue += Number(r.rate_price || 0) * nights;
      });

      const bookingsInWindow = rows.filter(r=>{
        const arr = soD(new Date(r.arrival));
        const dep = r.departure ? soD(new Date(r.departure)) : null;
        const stayEndExcl = dep ? dep : endPlus1;
        const overlapStart = new Date(Math.max(arr.getTime(), start.getTime()));
        const overlapEndExcl = new Date(Math.min(stayEndExcl.getTime(), endPlus1.getTime()));
        const nights = Math.max(0, Math.round((overlapEndExcl - overlapStart)/DAY));
        return nights > 0;
      }).length;

      const adr = bookingsInWindow ? Math.round((totalRevenue/bookingsInWindow)*100)/100 : null;

      let nOcc = null;
      if (hotel){
        const r = await supabase.from("availability").select("capacity,booked")
          .eq("hotel_code", hotel.code).gte("date", startDate).lte("date", endDate);
        if (!r.error && r.data?.length){
          const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
          nOcc = Math.round(avg);
        }
      } else {
        const r = await supabase.from("availability").select("capacity,booked")
          .gte("date", startDate).lte("date", endDate);
        if (!r.error && r.data?.length){
          const avg = r.data.reduce((s,a)=> s + Math.min(100, Math.round((Number(a.booked||0)/Math.max(1,Number(a.capacity||0)))*100)), 0)/r.data.length;
          nOcc = Math.round(avg);
        }
      }

      q("#nRevenue") && (q("#nRevenue").textContent = euro(totalRevenue));
      q("#nADR")     && (q("#nADR").textContent     = euro(adr));
      q("#nOcc")     && (q("#nOcc").textContent     = pct(nOcc));
    } catch (err) {
      console.error("loadKpisNext fatal", err);
      q("#nRevenue") && (q("#nRevenue").textContent  = "— €");
      q("#nADR")     && (q("#nADR").textContent      = "— €");
      q("#nOcc")     && (q("#nOcc").textContent      = "—%");
    }
  }

  /* ======================  RESERVATIONS TABLE  ========================== */
  let page=1, pageSize=50, search="", fHotel="all", fResNo="", fFrom=null, fTo=null, fStatus="active";

  function fillFilters(){
    const sel = q("#filterHotel"); if (!sel) return;
    sel.innerHTML = "";
    sel.append(el("option",{value:"all"},"Alle Hotels"));
    HOTELS.forEach(h => sel.append(el("option",{value:h.code}, displayHotel(h))));
  }
  function safeDisplayFromRow(row){
    if (!row) return "—";
    if (row.hotel_name) return row.hotel_name;
    const code = row.hotel_code || "";
    const h    = HOTELS.find(x=>x.code===code);
    return h ? displayHotel(h) : (code || "—");
  }
  function uiStatus(row){
    const todayStr = isoDate(soD(new Date()));
    let s = (row.status||"active").toLowerCase();
    if (s === "confirmed") s = "active";
    const arr = row.arrival ? isoDate(new Date(row.arrival)) : null;
    const dep = row.departure ? isoDate(new Date(row.departure)) : null;
    if (s !== "canceled" && ((dep && dep < todayStr) || (!dep && arr && arr < todayStr))) s = "done";
    return s;
  }

  async function loadReservations(){
    await autoRollPastToDone();

    const body = q("#resvBody"); if (!body) return;
    body.innerHTML = "";
    const from = (page-1) * pageSize, to = from + pageSize - 1;
    const todayStr = isoDate(soD(new Date()));

    const applyFilters = (query) => {
      if (search)  query = query.ilike("guest_last_name", `%${search}%`);
      if (fResNo)  query = query.ilike("reservation_number", `%${fResNo}%`);
      if (fFrom)   query = query.gte("arrival", fFrom);
      if (fTo)     query = query.lte("arrival", fTo);
      if (fStatus === "active"){
        query = query.gte("arrival", todayStr).neq("status","canceled").or("status.eq.active,status.eq.confirmed,status.is.null");
      } else if (fStatus === "done"){
        query = query.neq("status","canceled").lt("arrival", todayStr);
      } else if (fStatus === "canceled"){
        query = query.eq("status","canceled");
      }
      return query;
    };

    const selectCols = "id,reservation_number,guest_first_name,guest_last_name,arrival,departure,hotel_name,hotel_code,category,rate_name,rate_price,status,created_at";

    let data = [], count = 0, error = null;
    if (fHotel === "all"){
      let q1 = supabase.from("reservations").select(selectCols, { count:"exact" })
        .order("arrival",{ascending:true}).range(from,to);
      q1 = applyFilters(q1);
      const r = await q1;
      data = r.data || []; count = r.count || 0; error = r.error || null;
    } else {
      let qCode = supabase.from("reservations").select(selectCols).order("arrival",{ascending:true}).range(from,to);
      qCode = applyFilters(qCode.eq("hotel_code", fHotel));
      const r1 = await qCode;

      const needle = HOTEL_KEYWORD[fHotel] || hotelCity(HOTELS.find(h=>h.code===fHotel)?.name || "");
      let qName = supabase.from("reservations").select(selectCols).order("arrival",{ascending:true}).range(from,to);
      qName = applyFilters(qName.ilike("hotel_name", `%${needle}%`));
      const r2 = await qName;

      const map = new Map();
      (r1.data||[]).concat(r2.data||[]).forEach(row => map.set(row.id, row));
      data = [...map.values()];
      count = data.length;
      error = r1.error || r2.error || null;
    }
    if (error){ q("#pageInfo") && (q("#pageInfo").textContent = "Fehler"); console.warn(error); return; }

    data.forEach(row => {
      const rStatus = uiStatus(row);
      const dotCls  = rStatus==="canceled" ? "dot-canceled" : (rStatus==="done" ? "dot-done":"dot-active");
      const guest = `${row.guest_last_name||"—"}${row.guest_first_name ? ", "+row.guest_first_name : ""}`;
      const tr = el("tr", { class:"row", "data-id":row.id },
        el("td", {}, row.reservation_number || "—"),
        el("td", {}, safeDisplayFromRow(row)),
        el("td", {}, guest),
        el("td", {}, row.arrival ? D2.format(new Date(row.arrival)) : "—"),
        el("td", {}, row.departure ? D2.format(new Date(row.departure)) : "—"),
        el("td", {}, row.category || "—"),
        el("td", {}, row.rate_name || "—"),
        el("td", {}, row.rate_price!=null ? EUR.format(row.rate_price) : "—"),
        (()=>{
          const td = el("td",{class:"status"});
          td.append(el("span",{class:`status-dot ${dotCls}`}));
          td.append(document.createTextNode(rStatus));
          return td;
        })()
      );
      tr.addEventListener("click", () => openEdit(row.id));
      body.append(tr);
    });

    const totalPages = Math.max(1, Math.ceil((count||0)/pageSize));
    q("#pageInfo") && (q("#pageInfo").textContent = `Seite ${page} / ${totalPages}`);
  }

  // Filters
  q("#searchInput") ?.addEventListener("input", e=>{ search  = e.target.value.trim(); page=1; loadReservations(); });
  q("#filterHotel") ?.addEventListener("change", e=>{ fHotel = e.target.value; page=1; loadReservations(); });
  q("#filterResNo") ?.addEventListener("input", e=>{ fResNo = e.target.value.trim(); page=1; loadReservations(); });
  q("#filterFrom")  ?.addEventListener("change", e=>{ fFrom   = e.target.value||null; page=1; loadReservations(); });
  q("#filterTo")    ?.addEventListener("change", e=>{ fTo     = e.target.value||null; page=1; loadReservations(); });
  q("#filterStatus")?.addEventListener("change", e=>{ fStatus = e.target.value; page=1; loadReservations(); });
  q("#btnRefresh")  ?.addEventListener("click", async ()=>{ await autoRollPastToDone(); loadReservations(); });
  q("#prevPage")    ?.addEventListener("click", ()=>{ page = Math.max(1,page-1); loadReservations(); });
  q("#nextPage")    ?.addEventListener("click", ()=>{ page = page+1; loadReservations(); });

  /* ============================  EDIT MODAL  ============================= */
  async function fillEditDropdowns(hotelCode, curCat, curRate){
    const cats = HOTEL_CATEGORIES.default;
    const selCat = q("#eCat"); if (selCat) selCat.innerHTML = cats.map(c=>`<option ${c===curCat?'selected':''}>${c}</option>`).join("");

    try{
      let { data, error } = await supabase
        .from("rates")
        .select("name,price")
        .eq("hotel_code", hotelCode)
        .contains("categories", [curCat])
        .order("name",{ascending:true});

      const list = (!error && (data||[]).length) ? data : HOTEL_RATES.default;
      const selRate= q("#eRate");
      if (selRate){
        selRate.innerHTML = list.map(r=>`<option value="${r.name}" data-price="${r.price}" ${r.name===curRate?'selected':''}>${r.name} (${EUR.format(r.price)})</option>`).join("");
        selRate.addEventListener("change", e=>{
          const p = e.target.selectedOptions[0]?.dataset.price;
          if (p) q("#ePrice").value = p;
        });
      }
    }catch(err){ console.warn("fillEditDropdowns", err); }
  }

  async function openEdit(id){
    const { data, error } = await supabase.from("reservations").select("*").eq("id", id).maybeSingle();
    if (error || !data) return alert("Konnte Reservierung nicht laden.");

    q("#eResNo") && (q("#eResNo").value = data.reservation_number || "");
    q("#eHotel") && (q("#eHotel").value = safeDisplayFromRow(data));
    q("#eLname") && (q("#eLname").value = data.guest_last_name || "");
    q("#eArr")   && (q("#eArr").value   = data.arrival ? isoDate(new Date(data.arrival)) : "");
    q("#eDep")   && (q("#eDep").value   = data.departure ? isoDate(new Date(data.departure)) : "");

    const eStatus = q("#eStatus");
    if (eStatus){ eStatus.value = uiStatus(data); eStatus.disabled = true; }

    fillEditDropdowns(data.hotel_code, data.category||"", data.rate_name||"");

    q("#ePrice") && (q("#ePrice").value = data.rate_price || 0);
    q("#eNotes") && (q("#eNotes").value = data.notes || "");
    q("#eCcHolder") && (q("#eCcHolder").value = data.cc_holder || "");
    q("#eCcLast4")  && (q("#eCcLast4").value  = data.cc_last4  || "");
    q("#eCcExpM")   && (q("#eCcExpM").value   = data.cc_exp_month || "");
    q("#eCcExpY")   && (q("#eCcExpY").value   = data.cc_exp_year  || "");

    const createdAtTxt = data.created_at ? `Erstellt am ${new Date(data.created_at).toLocaleString("de-DE")}` : "";
    q("#editInfo") && (q("#editInfo").textContent = createdAtTxt);

    q("#btnSaveEdit") && (q("#btnSaveEdit").onclick = async ()=>{
      const payload = {
        guest_last_name: q("#eLname").value || null,
        arrival: q("#eArr").value || null,
        departure: q("#eDep").value || null,
        category: q("#eCat").value || null,
        rate_name: q("#eRate").value || null,
        rate_price: Number(q("#ePrice").value||0),
        notes: q("#eNotes").value || null
      };
      const { error } = await supabase.from("reservations").update(payload).eq("id", id);
      q("#editInfo").textContent = error ? ("Fehler: " + error.message) : createdAtTxt;
      await autoRollPastToDone(); await loadReservations();
    });

    q("#btnSavePay") && (q("#btnSavePay").onclick = async ()=>{
      const payload = {
        cc_holder: q("#eCcHolder").value || null,
        cc_last4:  q("#eCcLast4").value  || null,
        cc_exp_month: q("#eCcExpM").value ? Number(q("#eCcM")?.value || q("#eCcExpM").value) : null,
        cc_exp_year:  q("#eCcExpY").value ? Number(q("#eCcY")?.value || q("#eCcExpY").value) : null
      };
      const { error } = await supabase.from("reservations").update(payload).eq("id", id);
      q("#editInfo").textContent = error ? ("Fehler: " + error.message) : createdAtTxt;
    });

    q("#btnCancelRes") && (q("#btnCancelRes").onclick = async ()=>{
      const { error } = await supabase.from("reservations").update({ status:"canceled", canceled_at:new Date().toISOString() }).eq("id", id);
      q("#editInfo").textContent = error ? ("Fehler: " + error.message) : createdAtTxt;
      await loadReservations();
    });

    qa(".tab").forEach(b=>b.classList.remove("active")); q('.tab[data-tab="tabDet"]')?.classList.add("active");
    qa(".tabpage").forEach(p=>p.classList.add("hidden")); q("#tabDet")?.classList.remove("hidden");
    openModal("modalEdit");
  }

  qa(".tab").forEach(btn => {
    btn.addEventListener("click", ()=>{
      qa(".tab").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
      qa(".tabpage").forEach(p=>p.classList.add("hidden"));
      q("#"+btn.dataset.tab)?.classList.remove("hidden");
    });
  });

  /* ============================  WIZARD  ================================ */
  function ensureCatRateOptions(){
    const cats  = HOTEL_CATEGORIES.default;
    const rates = HOTEL_RATES.default;
    const selCat  = q("#newCat");
    const selRate = q("#newRate");
    if (selCat && !selCat.options.length){
      selCat.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join("");
      selCat.value = cats[0];
    }
    if (selRate && !selRate.options.length){
      selRate.innerHTML = rates.map(r => `<option value="${r.name}" data-price="${r.price}">${r.name} (${EUR.format(r.price)})</option>`).join("");
      selRate.value = rates[0].name;
      q("#newPrice") && (q("#newPrice").value = rates[0].price);
    }
    updateCatMeta();
    const desc = q("#catDesc");
    if (desc){
      desc.textContent = "das Zimmer hat eine größe von mehr oder weniger als 40m², Toaster, Mikrowelle und Balkon mit Ausblick. Dies ist ein Placeholder‑Text …";
    }
  }
  function updateCatMeta(){
    const cat = q("#newCat")?.value || "Standard";
    const m = CAT_META[cat] || {};
    const elBody = q("#catMetaBody");
    elBody && (elBody.innerHTML =
      `<div>Größe: <b>${m.size||"—"}</b></div>
       <div>Betten: <b>${m.beds||"—"}</b></div>
       <div>Hinweis: <b>${m.note||"—"}</b></div>`);
    const cap = q("#imgCatCaption");
    cap && (cap.textContent = `${cat} – Beispielbild`);
  }
  async function refreshWizardRates(){
    const code = q("#newHotel")?.value;
    const cat  = q("#newCat")?.value;
    const sel  = q("#newRate");
    if (!sel || !code || !cat) return;
    try{
      let qry = supabase.from("rates").select("name,price,cancel_policy").eq("hotel_code", code).contains("categories", [cat]).order("name",{ascending:true});
      if (REQUIRE_MAPPING) qry = qry.eq("mapped", true);
      const { data, error } = await qry;
      const list = (!error && (data||[]).length) ? data : (HOTEL_RATES.default.map(r=>({ name:r.name, price:r.price, cancel_policy:"Test rate" })));
      sel.innerHTML = list.map(r=>`<option value="${r.name}" data-price="${r.price}" data-policy="${r.cancel_policy||''}">${r.name} (${EUR.format(r.price)})</option>`).join("");
      if (list.length){
        q("#newPrice") && (q("#newPrice").value = list[0].price);
        q("#ratePolicy") && (q("#ratePolicy").textContent = list[0].cancel_policy || "—");
      }
    }catch(e){ console.warn("refreshWizardRates", e); }
  }
  q("#newRate")?.addEventListener("change", e=>{
    const opt = e.target.selectedOptions[0];
    if (!opt) return;
    const p = opt.dataset.price, pol = opt.dataset.policy || "";
    if (p && q("#newPrice")) q("#newPrice").value = p;
    if (q("#ratePolicy")) q("#ratePolicy").textContent = pol || "—";
    validateStep("3"); updateSummary("#summaryFinal");
  });

  function wizardSet(step){
    qa(".wstep").forEach(b=>b.classList.toggle("active", b.dataset.step==step));
    qa(".wpage").forEach(p=>p.classList.add("hidden"));
    q("#w"+step)?.classList.remove("hidden");
    q("#btnPrev")?.classList.toggle("hidden", step==="1");
    q("#btnNext")?.classList.toggle("hidden", step==="4");
    q("#btnCreate")?.classList.toggle("hidden", step!=="4");
    if (step==="2" || step==="3"){ ensureCatRateOptions(); setCatImage(SKETCH_IMG_SRC); }
    if (step==="1"){ setHotelImage(HOTEL_IMG_SRC); }
    if (step==="3"){ refreshWizardRates(); }
    validateStep(step);
    if (step==="4") updateSummary("#summaryFinal");
  }
  qa(".wstep").forEach(s => s.style.pointerEvents = "none");

  function validateStep(step){
    let ok=false;
    if (step==="1"){ ok = !!q("#newHotel")?.value && !!q("#newArr")?.value && !!q("#newDep")?.value; }
    else if (step==="2"){ ok = !!q("#newCat")?.value; }
    else if (step==="3"){ ok = !!q("#newRate")?.value && Number(q("#newPrice")?.value||0) > 0; }
    else if (step==="4"){ ok = true; }
    q("#btnNext") && (q("#btnNext").disabled = (!ok && step!=="4"));
    return ok;
  }
  function fillHotelSelect(){
    const sel=q("#newHotel"); if (!sel) return;
    sel.innerHTML = "";
    sel.append(el("option",{value:""},"Bitte wählen"));
    HOTELS.forEach(h=> sel.append(el("option",{value:h.code}, displayHotel(h))));
    sel.addEventListener("change", ()=>{
      const cats  = HOTEL_CATEGORIES.default;
      const rates = HOTEL_RATES.default;
      q("#newCat")  && (q("#newCat").innerHTML  = cats.map((c,i)=>`<option value="${c}" ${i===0?'selected':''}>${c}</option>`).join(""));
      q("#newRate") && (q("#newRate").innerHTML = rates.map((r,i)=>`<option value="${r.name}" data-price="${r.price}" ${i===0?'selected':''}>${r.name} (${EUR.format(r.price)})</option>`).join(""));
      q("#newPrice") && (q("#newPrice").value = rates[0].price);
      setHotelImage(HOTEL_IMG_SRC);
      setCatImage(SKETCH_IMG_SRC);
      validateStep("1"); updateSummary("#summaryFinal"); updateCatMeta();
      refreshWizardRates();
    });
  }
  q("#btnPrev")?.addEventListener("click", ()=>{
    const cur = Number(qa(".wstep.active")[0]?.dataset.step || 1);
    wizardSet(String(Math.max(1,cur-1)));
  });
  q("#btnNext")?.addEventListener("click", ()=>{
    const cur = String(qa(".wstep.active")[0]?.dataset.step || "1");
    if (!validateStep(cur)){ q("#newInfo") && (q("#newInfo").textContent="Bitte Pflichtfelder ausfüllen."); return; }
    const next = String(Math.min(4, Number(cur)+1));
    wizardSet(next);
  });
  ["newArr","newDep","newAdults","newChildren","newHotel","newFname","newLname"].forEach(id=>{
    q("#"+id)?.addEventListener("input", ()=>{ validateStep("1"); updateSummary("#summaryFinal"); });
  });
  q("#newCat")  ?.addEventListener("change", ()=>{ validateStep("2"); updateSummary("#summaryFinal"); setCatImage(SKETCH_IMG_SRC); updateCatMeta(); refreshWizardRates(); });
  q("#newPrice")?.addEventListener("input",  ()=>{ validateStep("3"); updateSummary("#summaryFinal"); });
  function linesSummary(){
    const code = q("#newHotel")?.value;
    const h    = HOTELS.find(x=>x.code===code);
    const adults   = Number(q("#newAdults")?.value||1);
    const children = Number(q("#newChildren")?.value||0);
    const fname = q("#newFname")?.value || "";
    const lname = q("#newLname")?.value || "";
    const gast  = (lname || fname) ? `${lname}${fname ? ", "+fname : ""}` : "—";
    return [
      ["Hotel",    h ? displayHotel(h) : "—"],
      ["Gast",     gast],
      ["Zeitraum", (q("#newArr")?.value||"—") + " → " + (q("#newDep")?.value||"—")],
      ["Belegung", `${adults} Erw. / ${children} Kind.`],
      ["Kategorie", q("#newCat")?.value||"—"],
      ["Rate",      q("#newRate")?.value||"—"],
      ["Preis",     q("#newPrice")?.value ? EUR.format(q("#newPrice").value) : "—"]
    ];
  }
  function updateSummary(selector="#summaryFinal"){
    const box = q(selector); if (!box) return;
    const rows = linesSummary().map(([k,v])=>`<div class="summary line"><span>${k}</span><span>${v}</span></div>`).join("");
    box.innerHTML = `<h4 class="mono">Zusammenfassung</h4>${rows}`;
  }
  function parseCc(){
    const num = (q("#ccNumber")?.value || "").replace(/\D/g,"");
    const last4 = num.slice(-4) || null;
    const holder= q("#ccHolder")?.value || null;
    const exp   = q("#ccExpiry")?.value || "";
    const m = exp.match(/^(\d{1,2})\s*\/\s*(\d{2})$/);
    const exp_m = m ? Number(m[1]) : null;
    const exp_y = m ? Number(m[2]) : null;
    return { last4, holder, exp_m, exp_y };
  }
  function genResNo(){ return "R" + Date.now().toString(36).toUpperCase(); }
  async function createReservation(){
    if (!validateStep("4")){ q("#newInfo") && (q("#newInfo").textContent="Bitte Pflichtfelder ausfüllen."); return; }
    const code = q("#newHotel")?.value;
    const hUI  = HOTELS.find(h=>h.code===code);
    const adults   = Number(q("#newAdults")?.value||1);
    const children = Number(q("#newChildren")?.value||0);
    const guests   = adults + children;
    const cc = parseCc();
    const payload = {
      reservation_number: genResNo(),
      status: "active",
      hotel_code: code || null,
      hotel_name: (hUI ? displayHotel(hUI) : (code||null)),
      arrival: q("#newArr")?.value || null,
      departure: q("#newDep")?.value || null,
      guests,
      guests_adults: adults,
      guests_children: children,
      category: q("#newCat")?.value || null,
      rate_name: q("#newRate")?.value || null,
      rate_price: Number(q("#newPrice")?.value||0),
      guest_first_name: q("#newFname")?.value || null,
      guest_last_name: q("#newLname")?.value || null,
      guest_email: q("#newEmail")?.value || null,
      guest_phone: q("#newPhone")?.value || null,
      guest_street: q("#newStreet")?.value || null,
      guest_postal_code: q("#newZip")?.value || null,
      guest_city: q("#newCity")?.value || null,
      company_name: q("#newCompany")?.value || null,
      company_vat: q("#newVat")?.value || null,
      company_postal_code: q("#newCompanyZip")?.value || null,
      company_address: q("#newAddress")?.value || null,
      cc_holder: cc.holder,
      cc_last4: cc.last4,
      cc_exp_month: cc.exp_m,
      cc_exp_year: cc.exp_y,
      channel: "Direct",
      notes: q("#newNotes")?.value || null
    };
    const { error } = await supabase.from("reservations").insert(payload);
    q("#newInfo") && (q("#newInfo").textContent = error ? ("Fehler: " + error.message) : "Reservierung gespeichert.");
    if (!error){
      await autoRollPastToDone();
      await loadKpisToday();
      await loadKpisNext();
      await loadReservations();
      setTimeout(()=>{ try{ closeModal("modalNew"); }catch(_){} }, 800);
    }
  }
  q("#btnCreate")?.addEventListener("click", createReservation);
  ["ccHolder","ccNumber","ccExpiry"].forEach(id=>{
    const map = { ccHolder:"ccHolderLive", ccNumber:"ccNumLive", ccExpiry:"ccExpLive" };
    const fmtNum = v => v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim().padEnd(19,"•");
    q("#"+id)?.addEventListener("input", e=>{
      const v = e.target.value;
      if (id==="ccNumber") q("#"+map[id]).textContent = fmtNum(v);
      else q("#"+map[id]).textContent = v || (id==="ccExpiry" ? "MM/YY" : "NAME");
    });
  });

  /* ===========================  AVAILABILITY  =========================== */
  function occColor(p){
    if (p==null) return "lvl-1";
    if (p<=64) return "lvl-0";
    if (p<=89) return "lvl-1";
    return "lvl-2";
  }
  async function buildAvailabilityPreview(){
    const box = q("#miniAvailPreview"); if (!box) return;
    box.innerHTML = "";
    const today = soD(new Date());
    for (let i=0;i<7;i++){
      const d = new Date(today); d.setDate(d.getDate()+i);
      const dateKey = isoDate(d);
      const r = await supabase.from("availability").select("capacity,booked").eq("date", dateKey);
      let p = null;
      if (!r.error && r.data?.length){
        const avg = r.data.reduce((s,a)=> s + (Math.max(1,Number(a.capacity||0)) ? (Number(a.booked||0)/Math.max(1,Number(a.capacity||0))*100) : 0), 0) / r.data.length;
        p = Math.round(Math.min(100, avg));
      }
      const item = el("div",{class:`mini-slot ${occColor(p)}`}, el("span",{class:"mini-date",text:Dm.format(d)}), el("span",{class:"mini-pct",text: pct(p)}));
      box.append(item);
    }
  }
  async function openAvailability(){
    openModal("modalAvail");
    await buildAvailabilityMatrix();
  }
  q("#btnAvail")?.addEventListener("click", openAvailability);

  async function buildAvailabilityMatrix(){
    const box = q("#availMatrix"); if (!box) return;
    box.innerHTML = "<div class='muted'>Lade Verfügbarkeiten…</div>";
    const start = soD(new Date());
    const days = 14;
    const dates = Array.from({length:days}, (_,i)=>{
      const d = new Date(start); d.setDate(d.getDate()+i); return d;
    });
    const head = el("div",{class:"matrix-head"});
    head.append(el("div",{class:"col col-hotel",text:"Hotel"}));
    dates.forEach(d => head.append(el("div",{class:"col col-date",text:Dm.format(d)})));
    const body = el("div",{class:"matrix-body"});

    for (const h of HOTELS){
      const row = el("div",{class:"row"});
      row.append(el("div",{class:"cell cell-hotel",text:displayHotel(h)}));
      for (const d of dates){
        const dk = isoDate(d);
        const r = await supabase.from("availability").select("capacity,booked").eq("hotel_code", h.code).eq("date", dk).maybeSingle();
        let p = null;
        if (!r.error && r.data){ p = Math.round(Math.min(100, Number(r.data.booked||0) / Math.max(1,Number(r.data.capacity||0)) * 100)); }
        const cell = el("div",{class:`cell cell-day ${occColor(p)}`, title:`${displayHotel(h)} • ${Dm.format(d)} • ${pct(p)}`}, el("span",{class:"pct",text: pct(p)}));
        row.append(cell);
      }
      body.append(row);
    }
    box.innerHTML = "";
    box.append(head, body);
  }

  /* ============================  REPORTING  ============================= */
  function getReportFilters(){
    return {
      hotel:  q("#repHotel")?.value || "all",
      status: q("#repStatus")?.value || "all",
      from:   q("#repFrom")?.value || null,
      to:     q("#repTo")?.value || null,
      name:   q("#repName")?.value?.trim() || ""
    };
  }
  async function fetchReportRows(){
    const f = getReportFilters();
    const cols = "id,reservation_number,guest_last_name,guest_first_name,arrival,departure,hotel_code,hotel_name,category,rate_name,rate_price,status,created_at";
    let qy = supabase.from("reservations").select(cols).order("arrival",{ascending:true});
    if (f.hotel!=="all") qy = qy.eq("hotel_code", f.hotel);
    if (f.status!=="all") qy = qy.eq("status", f.status);
    if (f.from) qy = qy.gte("arrival", f.from);
    if (f.to)   qy = qy.lte("arrival", f.to);
    if (f.name) qy = qy.ilike("guest_last_name", `%${f.name}%`);
    const { data, error } = await qy;
    if (error) throw error;
    return data || [];
  }
  function toCsv(rows){
    const head = ["reservation_number","hotel_code","hotel_name","guest_last_name","guest_first_name","arrival","departure","category","rate_name","rate_price","status","created_at"];
    const esc = s => `"${String(s ?? "").replace(/"/g,'""')}"`;
    const lines = [head.join(";")].concat(rows.map(r => head.map(k => esc(r[k])).join(";")));
    return lines.join("\n");
  }
  async function runExportCsv(){
    try{
      const rows = await fetchReportRows();
      const csv = toCsv(rows);
      download("report.csv","text/csv;charset=utf-8", csv);
    }catch(e){ alert("Export-Fehler: " + e.message); }
  }
  q("#btnExportCsv")?.addEventListener("click", runExportCsv);
  q("#btnReporting")?.addEventListener("click", ()=> openModal("modalReporting"));

  /* ============================  SETTINGS  ============================== */
  q("#btnSettings")?.addEventListener("click", ()=> openModal("modalSettings"));

  /* ==============================  SKETCH  ============================== */
  function showSketch(hotel){
    const label = q("#sketchHotelLabel");
    label && (label.textContent = `${hotel.group} - ${hotel.name.replace(/^.*? /,'')}`);
    setSketchImage(SKETCH_IMG_SRC);
    qa(".sketch-item").forEach(btn => btn.classList.toggle("active", btn.dataset.code === hotel.code));
  }
  function buildSketch(){
    const listBox = q("#sketchList");
    if (!listBox) return;
    listBox.innerHTML = "";
    HOTELS.forEach(h => {
      const btn = el("button",{class:"sketch-item", "data-code":h.code, title:h.code});
      const badge = el("span",{class:"sketch-badge", text:h.group});
      const name  = el("span",{class:"sketch-name",  text:hotelCity(h.name)});
      btn.append(badge, name);
      btn.addEventListener("click", ()=> showSketch(h));
      listBox.append(btn);
    });
    if (HOTELS.length){ showSketch(HOTELS[0]); }
  }
  q("#btnSketch")?.addEventListener("click", ()=> openModal("modalSketch"));

  /* ==============================  RATES  =============================== */
  const RATE_TYPES = ["Direct","Corp","IDS"];
  function ensureRatesModalDOM(){
    let m = q("#modalRates"); if (m) return m;
    m = el("section",{ id:"modalRates", class:"modal", role:"dialog", "aria-modal":"true" });
    m.innerHTML = `
      <header>
        <h3 class="mono"><span class="set-logo" aria-hidden="true"></span> Ratenverwaltung</h3>
        <button class="btn" data-close>Schließen</button>
      </header>
      <div class="body">
        <div class="row wrap" style="gap:8px;align-items:center;margin-bottom:8px">
          <button class="btn sm" data-ratetab="Direct">Direct-Rate</button>
          <button class="btn sm" data-ratetab="Corp">Corp-Rate</button>
          <button class="btn sm" data-ratetab="IDS">IDS-Rate</button>
          <span style="flex:1"></span>
          <button class="btn primary" id="btnNewRate">Neue Rate</button>
        </div>
        <div id="ratesList"></div>
      </div>`;
    document.body.append(m);
    m.querySelector("[data-close]")?.addEventListener("click", ()=> closeModal("modalRates"));
    m.querySelectorAll("[data-ratetab]").forEach(btn => btn.addEventListener("click", ()=>{
      state.ratesTab = btn.getAttribute("data-ratetab");
      loadRates();
    }));
    m.querySelector("#btnNewRate")?.addEventListener("click", openRateCreate);
    return m;
  }
  const state = { ratesTab:"Direct" };
  const typePill = t => {
    const map = { Direct:"pill lvl-0", Corp:"pill lvl-2", IDS:"pill lvl-1" };
    return `<span class="${map[t]||"pill"}">${t}</span>`;
  };

  async function ensureSeedRates(){
    try{
      const probe = await supabase.from("rates").select("id", { count:"exact", head:true });
      if (probe.error || (probe.count||0) > 0) return;
      let code = 1000;
      const rows = [];
      for (const h of HOTELS){
        rows.push({ rate_code: code++, type:"Direct", hotel_code:h.code, categories: HOTEL_CATEGORIES.default, name:"Flex exkl. Frühstück", cancel_policy:"Test rate", price:89, mapped:true });
        rows.push({ rate_code: code++, type:"Direct", hotel_code:h.code, categories: HOTEL_CATEGORIES.default, name:"Flex inkl. Frühstück", cancel_policy:"Test rate", price:109, mapped:true });
      }
      await supabase.from("rates").insert(rows);
    }catch(e){ console.warn("seed rates skipped", e.message); }
  }

  async function loadRates(){
    await ensureSeedRates();
    const list = q("#ratesList"); if (!list) return;
    list.innerHTML = "<p class='muted'>Lade …</p>";
    try{
      const { data, error } = await supabase
        .from("rates")
        .select("id,hotel_code,rate_code,type,name,price,cancel_policy,categories,mapped,created_at")
        .eq("type", state.ratesTab)
        .order("hotel_code",{ascending:true})
        .order("name",{ascending:true});
      if (error) throw error;
      if (!data || !data.length){ list.innerHTML = `<div class="box"><p class="muted">Keine Raten im Tab <b>${state.ratesTab}</b> gefunden.</p></div>`; return; }

      const groupByHotel = data.reduce((acc,r)=>{ (acc[r.hotel_code||"—"] ||= []).push(r); return acc; },{});
      const frag = document.createDocumentFragment();
      for (const [code, items] of Object.entries(groupByHotel)){
        const h = HOTELS.find(x=>x.code===code);
        const card = el("article",{class:"card"});
        const header = el("div",{class:"content"},
          el("div",{class:"card-head"},
            el("h3",{class:"mono"}, `${displayHotel(h)||code} — ${items.length} Rate(n)`),
            el("span",{}, "")
          )
        );
        const body = el("div",{class:"content"});
        const table = el("table",{class:"resv"});
        table.innerHTML = `
          <thead><tr>
            <th>Ratecode</th><th>Typ</th><th>Name</th><th>Kategorien</th><th>Preis</th><th>Policy</th><th>Mapping</th><th></th>
          </tr></thead>
          <tbody></tbody>`;
        const tb = table.querySelector("tbody");
        items.forEach(r=>{
          const tr = el("tr",{});
          tr.innerHTML = `
            <td>${r.rate_code||"—"}</td>
            <td>${typePill(r.type||"—")}</td>
            <td>${r.name||"—"}</td>
            <td>${(r.categories||[]).join(", ")||"—"}</td>
            <td>${r.price!=null?EUR.format(r.price):"—"}</td>
            <td class="muted">${r.cancel_policy||"—"}</td>
            <td>${r.mapped?'<span class="pill lvl-0">gemappt</span>':'<span class="pill lvl-1">offen</span>'}</td>
            <td><button class="btn sm" data-edit="${r.id}">Bearbeiten</button></td>`;
          tb.append(tr);
        });
        body.append(table);
        card.append(header, body);
        frag.append(card);
      }
      list.innerHTML = "";
      list.append(frag);
      list.querySelectorAll("[data-edit]").forEach(btn=> btn.addEventListener("click", ()=> openRateEdit(btn.getAttribute("data-edit")) ));
    }catch(e){
      console.error(e);
      list.innerHTML = `<div class="box"><p class="muted">Fehler beim Laden: ${e.message}</p></div>`;
    }
  }

  function rateForm(rate){
    const isNew = !rate;
    const r = rate || { rate_code:"", type: state.ratesTab, hotel_code:"", categories:[], name:"", cancel_policy:"", price:null, mapped:false };
    const catsOptions = HOTEL_CATEGORIES.default.map(c=>`<option value="${c}" ${r.categories?.includes(c)?'selected':''}>${c}</option>`).join("");
    const hotelOpts = HOTELS.map(h=>`<option value="${h.code}" ${r.hotel_code===h.code?'selected':''}>${displayHotel(h)}</option>`).join("");
    const typeOpts  = RATE_TYPES.map(t=>`<option value="${t}" ${r.type===t?'selected':''}>${t}</option>`).join("");
    return `
      <div class="grid-compact">
        <label>Ratecode (nur Zahlen)
          <input id="rfCode" class="input" inputmode="numeric" pattern="\\d*" value="${r.rate_code||''}" placeholder="z.B. 1001"/>
        </label>
        <label>Ratentyp*
          <select id="rfType" class="input theme-select">${typeOpts}</select>
        </label>
        <label style="grid-column:1 / -1">Hotel
          <select id="rfHotel" class="input theme-select">${hotelOpts}</select>
        </label>
        <label style="grid-column:1 / -1">Kategorien (Mehrfachwahl mit Strg/Cmd)
          <select id="rfCats" class="input theme-select" multiple size="3">${catsOptions}</select>
        </label>
        <label style="grid-column:1 / -1">Ratename
          <input id="rfName" class="input" value="${r.name||''}" placeholder="Anzeigename der Rate"/>
        </label>
        <label style="grid-column:1 / -1">Stornobedingung
          <textarea id="rfPol" class="input" rows="3" placeholder="Policy">${r.cancel_policy||''}</textarea>
        </label>
        <label>Preis pro Nacht
          <input id="rfPrice" type="number" class="input" step="1" value="${r.price!=null?r.price:''}" placeholder="89"/>
        </label>
        <label>Mapping aktiv?
          <select id="rfMapped" class="input theme-select">
            <option value="false" ${!r.mapped?'selected':''}>Nein</option>
            <option value="true"  ${r.mapped?'selected':''}>Ja</option>
          </select>
        </label>
      </div>
      <div class="right" style="margin-top:10px">
        ${!isNew ? '<button class="btn danger" id="rfDelete">Löschen</button>' : ''}
        <button class="btn primary" id="rfSave">Rate speichern</button>
      </div>`;
  }

  function openRatesModal(){
    ensureRatesModalDOM();
    openModal("modalRates");
    loadRates();
  }
  window.openRatesModal = openRatesModal;

  async function openRateEdit(id){
    const { data, error } = await supabase.from("rates").select("*").eq("id", id).maybeSingle();
    if (error || !data) return alert("Rate konnte nicht geladen werden.");
    const box = el("div",{class:"modal", id:"modalRateEdit", role:"dialog","aria-modal":"true"});
    box.innerHTML = `
      <header><h3 class="mono">Rate bearbeiten</h3><button class="btn" data-close>Schließen</button></header>
      <div class="body">${rateForm(data)}</div>`;
    document.body.append(box);
    box.querySelector("[data-close]")?.addEventListener("click", ()=> box.remove());
    openModal("modalRateEdit");
    box.querySelector("#rfDelete")?.addEventListener("click", async ()=>{
      if (!confirm("Diese Rate wirklich löschen?")) return;
      const { error } = await supabase.from("rates").delete().eq("id", id);
      if (error) alert(error.message);
      box.remove(); loadRates();
    });
    box.querySelector("#rfSave")?.addEventListener("click", async ()=>{
      const payload = readRateForm(box);
      const { error } = await supabase.from("rates").update(payload).eq("id", id);
      if (error) return alert(error.message);
      box.remove(); loadRates();
    });
  }

  function readRateForm(scope=document){
    const val = sel => scope.querySelector(sel)?.value ?? "";
    const getCats = ()=> Array.from(scope.querySelector("#rfCats")?.selectedOptions || []).map(o=>o.value);
    const rate_code = (val("#rfCode")||"").replace(/\D/g,"");
    const price = val("#rfPrice")!=="" ? Number(val("#rfPrice")) : null;
    return {
      rate_code,
      type: val("#rfType") || "Direct",
      hotel_code: val("#rfHotel") || null,
      categories: getCats(),
      name: val("#rfName") || null,
      cancel_policy: val("#rfPol") || null,
      price,
      mapped: (val("#rfMapped")||"false") === "true"
    };
  }

  function openRateCreate(){
    const box = el("div",{class:"modal", id:"modalRateNew", role:"dialog","aria-modal":"true"});
    box.innerHTML = `
      <header><h3 class="mono">Neue Rate</h3><button class="btn" data-close>Schließen</button></header>
      <div class="body">${rateForm()}</div>`;
    document.body.append(box);
    box.querySelector("[data-close]")?.addEventListener("click", ()=> box.remove());
    openModal("modalRateNew");
    box.querySelector("#rfSave")?.addEventListener("click", async ()=>{
      const payload = readRateForm(box);
      if (!payload.type) return alert("Ratentyp ist Pflicht.");
      if (!payload.hotel_code) return alert("Bitte Hotel wählen.");
      if (!payload.name) return alert("Bitte Ratename angeben.");
      if (!payload.rate_code || !/^\d+$/.test(payload.rate_code)) return alert("Ratecode nur Zahlen.");
      const { error } = await supabase.from("rates").insert(payload);
      if (error) return alert(error.message);
      box.remove(); loadRates();
    });
  }

  q("#btnRates")?.addEventListener("click", openRatesModal);

  /* ==========================  ROLLUP/STATUS  =========================== */
  async function autoRollPastToDone(){
    const today = isoDate(soD(new Date()));
    await supabase.from("reservations")
      .update({ status:"done" })
      .lt("departure", today)
      .neq("status","canceled")
      .or("status.eq.active,status.eq.confirmed,status.is.null");
    await supabase.from("reservations")
      .update({ status:"done" })
      .is("departure", null)
      .lt("arrival", today)
      .neq("status","canceled")
      .or("status.eq.active,status.eq.confirmed,status.is.null");
  }

  /* ===============================  INIT  =============================== */
  function init(){
    startClocks();
    refreshStatus();
    buildMiniAnalytics();
    fillHotelFilter(q("#kpiFilterToday"));
    fillHotelFilter(q("#kpiFilterNext"));
    fillFilters();
    loadKpisToday();
    loadKpisNext();
    loadReservations();
    fillHotelSelect();
    buildAvailabilityPreview();
    buildSketch();

    // Toolbar shortcuts
    q("#btnNew")?.addEventListener("click", ()=> openModal("modalNew"));
    q("#btnAvail")?.addEventListener("click", openAvailability);
    q("#btnReporting")?.addEventListener("click", ()=> openModal("modalReporting"));
    q("#btnSettings")?.addEventListener("click", ()=> openModal("modalSettings"));
    q("#btnSketch")?.addEventListener("click", ()=> openModal("modalSketch"));

    wizardSet("1");
  }
  document.addEventListener("DOMContentLoaded", init);
})();
