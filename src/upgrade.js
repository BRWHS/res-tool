
/* ==========================================================
   RES-TOOL • LEVEL-UP SCRIPTS (drop-in, non-breaking)
   Place AFTER your existing app.js
   ========================================================== */
(function(){
  if (window.__RES_TOOL_LEVELUP__) return;
  window.__RES_TOOL_LEVELUP__ = true;

  // ---- Helpers ----
  window.debounce = window.debounce || function(fn, ms=250){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a), ms); }; };
  window.download = window.download || function(filename, mime, content){
    const blob = new Blob([content], { type: mime||'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  };
  if (!window.showToast){
    window.showToast = function(msg, ms=1800){
      const el = document.getElementById('appToast') || (function(){
        const t=document.createElement('div'); t.id='appToast'; t.className='toast hidden'; document.body.appendChild(t); return t;
      })();
      el.textContent = msg;
      el.classList.remove('hidden');
      el.classList.add('show');
      clearTimeout(el.__t);
      el.__t = setTimeout(()=>{
        el.classList.remove('show');
        setTimeout(()=> el.classList.add('hidden'), 180);
      }, ms);
    }
  }
  if (!window.copyToClipboard){
    window.copyToClipboard = async function(txt){
      try{ await navigator.clipboard.writeText(txt); showToast('Kopiert'); } catch(e){ showToast('Konnte nicht kopieren'); }
    }
  }

  // ---- UI polish: add glowbar if missing ----
  if (!document.getElementById('appGlowBar')){
    const g = document.createElement('div'); g.id = 'appGlowBar'; g.setAttribute('aria-hidden','true'); document.body.prepend(g);
  }

  // ---- Reservations: persist filters + CSV export + sorting ----
  (function enhanceReservationList(){
    const table = document.getElementById('resTable');
    const body  = document.getElementById('resvBody') || (table ? table.querySelector('tbody') : null);
    if (!table || !body) return;

    const get = (s)=>document.querySelector(s);
    const STORAGE_KEY = 'resTool.filters.v4';

    // 1) restore filters on boot
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw){
        const d = JSON.parse(raw);
        if (get('#searchInput'))   get('#searchInput').value   = d.q || '';
        if (get('#filterHotel'))   get('#filterHotel').value   = d.h || '';
        if (get('#filterStatus'))  get('#filterStatus').value  = d.s || 'active';
        if (get('#filterResNo'))   get('#filterResNo').value   = d.rn || '';
        if (get('#filterFrom'))    get('#filterFrom').value    = d.f || '';
        if (get('#filterTo'))      get('#filterTo').value      = d.t || '';
      }
    }catch(e){}

    const save = ()=>{
      const d = {
        q:  get('#searchInput')?.value || '',
        h:  get('#filterHotel')?.value || '',
        s:  get('#filterStatus')?.value || '',
        rn: get('#filterResNo')?.value || '',
        f:  get('#filterFrom')?.value || '',
        t:  get('#filterTo')?.value || ''
      };
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }catch(e){}
    };

    const debReload = debounce(()=>{ save(); try{ window.loadReservations && window.loadReservations(); }catch(e){} }, 350);
    ['#searchInput','#filterHotel','#filterStatus','#filterResNo','#filterFrom','#filterTo'].forEach(sel => {
      const el = get(sel); if (!el) return;
      const ev = (el.tagName === 'SELECT' || el.type === 'date') ? 'change':'input';
      el.addEventListener(ev, debReload);
    });

    // Reset button (inject if missing)
    if (!document.getElementById('btnClearFilters')){
      const toolbar = document.querySelector('.table-tools .row');
      if (toolbar){
        const btnR = document.createElement('button'); btnR.className='btn ghost'; btnR.id='btnClearFilters'; btnR.textContent='Reset';
        toolbar.appendChild(btnR);
      }
    }
    document.getElementById('btnClearFilters')?.addEventListener('click', ()=>{
      ['#searchInput','#filterHotel','#filterStatus','#filterResNo','#filterFrom','#filterTo'].forEach(sel => {
        const el = get(sel); if (!el) return;
        if (el.tagName === 'SELECT') el.selectedIndex = 0; else el.value = '';
      });
      save();
      try{ window.loadReservations && window.loadReservations(); }catch(e){}
    });

    // CSV export (inject if missing)
    if (!document.getElementById('resExportCsv')){
      const toolbar = document.querySelector('.table-tools .row');
      if (toolbar){
        const btnX = document.createElement('button'); btnX.className='btn ghost'; btnX.id='resExportCsv'; btnX.textContent='Export CSV';
        toolbar.appendChild(btnX);
      }
    }
    document.getElementById('resExportCsv')?.addEventListener('click', ()=>{
      const rows = Array.from(table.querySelectorAll('tr'));
      const csv = rows.map(tr => Array.from(tr.children).map(td => {
        let t = td.textContent.replace(/\s+/g,' ').replace(/\n/g,' ').trim();
        return '"' + t.replace(/"/g,'""') + '"';
      }).join(',')).join('\n');
      download('reservierungen.csv', 'text/csv;charset=utf-8', csv);
      showToast('CSV exportiert');
    });

    // Sorting
    const ths = Array.from(table.querySelectorAll('thead th'));
    ths.forEach((th, i)=>{
      th.classList.add('sortable');
      const ind = document.createElement('span'); ind.className='sort-ind'; th.appendChild(ind);
      th.addEventListener('click', ()=>{
        const state = th.classList.contains('asc') ? 'asc' : th.classList.contains('desc') ? 'desc' : '';
        ths.forEach(h=>h.classList.remove('asc','desc'));
        const next = state==='asc' ? 'desc':'asc';
        th.classList.add(next);
        const rows = Array.from(body.querySelectorAll('tr'));
        const parse = (td) => {
          const v = td.textContent.trim();
          const num = v.replace(/[^0-9,.-]/g,'').replace('.', '').replace(',', '.');
          return (v && !isNaN(Number(num))) ? Number(num) : v.toLowerCase();
        };
        rows.sort((a,b)=>{
          const av = parse(a.children[i] || {textContent:''});
          const bv = parse(b.children[i] || {textContent:''});
          if (av < bv) return next==='asc' ? -1 : 1;
          if (av > bv) return next==='asc' ? 1 : -1;
          return 0;
        });
        rows.forEach(r => body.appendChild(r));
      });
    });
  })();

  // ---- Confirmation modal enhancements ----
  (function(){
    const by = id => document.getElementById(id);
    by('btnCopyEmail')?.addEventListener('click', ()=>{
      const v = by('confirmEmailTo')?.value || ''; if (!v) return showToast('Keine E-Mail eingetragen'); copyToClipboard(v);
    });
    by('btnCopyConfirmation')?.addEventListener('click', ()=>{
      const v = by('confirmEmailBody')?.value || ''; if (!v) return showToast('Kein Text vorhanden'); copyToClipboard(v);
    });
  })();

  // ---- Keyboard shortcuts ----
  document.addEventListener('keydown', (e)=>{
    if (e.target && (/INPUT|TEXTAREA|SELECT/).test(e.target.tagName)) return;
    if (e.key === '/') { const s=document.getElementById('searchInput'); if(s){ e.preventDefault(); s.focus(); } }
    if (e.key.toLowerCase() === 'n') { const b=document.getElementById('btnNew'); if(b){ e.preventDefault(); b.click(); } }
  });

  // ---- Minor: sticky shadow on scroll for toolbars ----
  (function(){
    const bar = document.querySelector('.table-tools');
    if (!bar) return;
    const obs = new IntersectionObserver(([e])=>{
      bar.style.boxShadow = e.intersectionRatio < 1 ? '0 6px 18px rgba(0,0,0,.35)' : 'none';
    }, { threshold: [1] });
    const s = document.createElement('div'); s.style.position='absolute'; s.style.top='0'; s.style.height='1px'; s.style.width='1px'; bar.prepend(s);
    obs.observe(s);
  })();

})(); 
