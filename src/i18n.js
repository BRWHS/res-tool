// HTML lang-Attribut und Dock-Tooltip passend setzen
document.documentElement.lang = (lang === 'en' ? 'en' : 'de');
document.getElementById('dockToggle')?.setAttribute('title', tr('dock.toggle', lang));

// ===== Light i18n engine for res-tool =====
(function(){
  const LS_KEY = 'resTool.lang';

  const I18N = {
    de: { // German originals
      'brand.title': 'res-tool',
      'btn.new': 'Neue Reservierung',
      'btn.avail': 'Verfügbarkeit',
      'btn.reporting': 'Reporting',
      'btn.settings': 'Einstellungen',
      'btn.sketch': 'Hotelskizze',
      'kpi.today.title': 'Performance - Heute',
      'kpi.today.bookings': 'Buchungen (heute eingegangen)',
      'kpi.today.revenue': 'Umsatz (heute)',
      'kpi.today.adr': 'ADR (heute)',
      'kpi.today.occ': 'Auslastung (heute)',
      'kpi.next.title': 'Performance - Nächste 7 Tage',
      'kpi.next.revenue': 'Umsatz (Anreisen +1..+7)',
      'kpi.next.adr': 'WDR (+1..+7)',
      'kpi.next.occ': 'Ø Auslastung (+1..+7)',
      'res.table.title': 'Reservierungen',
      'res.table.th.resno': 'Res.-Nr.',
      'res.table.th.hotel': 'Hotel',
      'res.table.th.guest': 'Gastname',
      'res.table.th.arr': 'Anreise',
      'res.table.th.dep': 'Abreise',
      'res.table.th.cat': 'Kategorie',
      'res.table.th.rate': 'Rate',
      'res.table.th.price': 'Preis',
      'res.table.th.status': 'Status',
      'res.filter.search': 'Gastname…',
      'res.filter.status.active': 'Status: Active (Zukunft)',
      'res.filter.status.done': 'Status: Done (Vergangenheit)',
      'res.filter.status.canceled': 'Status: Canceled',
      'res.filter.status.all': 'Status: Alle',
      'res.filter.resno': 'Res.-Nr.',
      'res.filter.from': 'Von',
      'res.filter.to': 'Bis',
      'btn.refresh': 'Refresh',
      'btn.reset': 'Reset',
      'btn.export.csv': 'Export CSV',
      'modal.new.title': 'Neue Reservierung',
      'wiz.step1': 'Hotel & Daten',
      'wiz.step2': 'Kategorie',
      'wiz.step3': 'Rate',
      'wiz.step4': 'Gast & Zahlung',
      'step1.arrival': 'Anreise',
      'step1.departure': 'Abreise',
      'step1.adults': 'Erwachsene',
      'step1.children': 'Kinder',
      'contact.phone': 'Telefon',
      'contact.email': 'E-Mail',
      'step2.facts': 'Fakten',
      'step2.desc': 'Beschreibung',
      'step3.policy': 'Stornobedingung',
      'step4.company': 'Firma (optional)',
      'step4.cc': 'Kreditkarte',
      'step4.notes': 'Notizen',
      'btn.prev': 'Zurück',
      'btn.next': 'Weiter',
      'btn.create': 'Reservierung abschicken',
      'modal.edit.title': 'Reservierung bearbeiten',
      'edit.tabs.details': 'Details',
      'edit.tabs.plan': 'Preisplan',
      'edit.tabs.pay': 'Zahlungskonto',
      'edit.tabs.actions': 'Aktionen',
      'edit.total': 'Gesamtpreis',
      'edit.notes': 'Notizen',
      'btn.save': 'Speichern',
      'btn.cancel': 'Stornieren',
      'btn.resend': 'Bestätigung erneut senden',
      'modal.avail.title': 'Verfügbarkeit',
      'avail.legend': 'Legende:',
      'avail.legend.g': '≤64%',
      'avail.legend.o': '65–89%',
      'avail.legend.r': '≥90%',
      'btn.avail.update': 'Aktualisieren',
      'modal.reporting.title': 'Reporting',
      'report.revenue': 'Umsatz pro Hotel',
      'report.bookings': 'Buchungen pro Hotel',
      'btn.export.xls': 'Export Excel',
      'btn.export.csv': 'Export CSV',
      'btn.export.pdf': 'Export PDF',
      'modal.settings.title': 'Einstellungen',
      'settings.lang': 'Sprache',
      'settings.hue': 'Farbton (Hue)',
      'settings.save': 'Einstellungen speichern',
      'settings.userprefs': 'Benutzereinstellungen',
      'settings.channel': 'Channel – Einstellungen',
      'settings.log': 'Log Activity',
      'settings.cats': 'Kategorieverwaltung',
      'settings.rates': 'Rateneinstellungen',
      'settings.help': 'Hilfe & FAQ',
      'sysinfo.title': 'Live-Systeminfo',
      'modal.rate.edit': 'Rate bearbeiten',
      'modal.rate.create': 'Neue Rate',
      'btn.rate.create': 'Rate erstellen',
      'btn.rate.update': 'Änderungen speichern',
      'btn.rate.delete': 'Rate löschen',
      'modal.cats.title': 'Kategorieverwaltung',
      'cats.new.title': 'Neue Kategorie',
      'btn.sync.now': 'Jetzt synchronisieren',
      'channel.title': 'Channel – Einstellungen',
      'channel.api.title': 'API – Einstellungen',
      'channel.prop.title': 'Property – Mapping',
      'channel.monitor.title': 'Monitoring',
      'channel.system.title': 'System – Technik',
      'channel.admin.title': 'Admin',
    },
    en: {
      'brand.title': 'res-tool',
      'btn.new': 'New Reservation',
      'btn.avail': 'Availability',
      'btn.reporting': 'Reporting',
      'btn.settings': 'Settings',
      'btn.sketch': 'Hotel Sketch',
      'kpi.today.title': 'Performance - Today',
      'kpi.today.bookings': 'Bookings (received today)',
      'kpi.today.revenue': 'Revenue (today)',
      'kpi.today.adr': 'ADR (today)',
      'kpi.today.occ': 'Occupancy (today)',
      'kpi.next.title': 'Performance - Next 7 Days',
      'kpi.next.revenue': 'Revenue (arrivals +1..+7)',
      'kpi.next.adr': 'WDR (+1..+7)',
      'kpi.next.occ': 'Avg. Occupancy (+1..+7)',
      'res.table.title': 'Reservations',
      'res.table.th.resno': 'Res. No.',
      'res.table.th.hotel': 'Hotel',
      'res.table.th.guest': 'Guest name',
      'res.table.th.arr': 'Arrival',
      'res.table.th.dep': 'Departure',
      'res.table.th.cat': 'Category',
      'res.table.th.rate': 'Rate',
      'res.table.th.price': 'Price',
      'res.table.th.status': 'Status',
      'res.filter.search': 'Guest name…',
      'res.filter.status.active': 'Status: Active (future)',
      'res.filter.status.done': 'Status: Done (past)',
      'res.filter.status.canceled': 'Status: Canceled',
      'res.filter.status.all': 'Status: All',
      'res.filter.resno': 'Res. No.',
      'res.filter.from': 'From',
      'res.filter.to': 'To',
      'btn.refresh': 'Refresh',
      'btn.reset': 'Reset',
      'btn.export.csv': 'Export CSV',
      'modal.new.title': 'New Reservation',
      'wiz.step1': 'Hotel & Dates',
      'wiz.step2': 'Category',
      'wiz.step3': 'Rate',
      'wiz.step4': 'Guest & Payment',
      'step1.arrival': 'Arrival',
      'step1.departure': 'Departure',
      'step1.adults': 'Adults',
      'step1.children': 'Children',
      'contact.phone': 'Phone',
      'contact.email': 'Email',
      'step2.facts': 'Facts',
      'step2.desc': 'Description',
      'step3.policy': 'Cancellation policy',
      'step4.company': 'Company (optional)',
      'step4.cc': 'Credit Card',
      'step4.notes': 'Notes',
      'btn.prev': 'Back',
      'btn.next': 'Next',
      'btn.create': 'Submit reservation',
      'modal.edit.title': 'Edit Reservation',
      'edit.tabs.details': 'Details',
      'edit.tabs.plan': 'Price Plan',
      'edit.tabs.pay': 'Payment',
      'edit.tabs.actions': 'Actions',
      'edit.total': 'Total price',
      'edit.notes': 'Notes',
      'btn.save': 'Save',
      'btn.cancel': 'Cancel',
      'btn.resend': 'Resend confirmation',
      'modal.avail.title': 'Availability',
      'avail.legend': 'Legend:',
      'avail.legend.g': '≤64%',
      'avail.legend.o': '65–89%',
      'avail.legend.r': '≥90%',
      'btn.avail.update': 'Update',
      'modal.reporting.title': 'Reporting',
      'report.revenue': 'Revenue by hotel',
      'report.bookings': 'Bookings by hotel',
      'btn.export.xls': 'Export Excel',
      'btn.export.csv': 'Export CSV',
      'btn.export.pdf': 'Export PDF',
      'modal.settings.title': 'Settings',
      'settings.lang': 'Language',
      'settings.hue': 'Hue (color)',
      'settings.save': 'Save settings',
      'settings.userprefs': 'User preferences',
      'settings.channel': 'Channel settings',
      'settings.log': 'Log Activity',
      'settings.cats': 'Category Management',
      'settings.rates': 'Rate settings',
      'settings.help': 'Help & FAQ',
      'sysinfo.title': 'Live system info',
      'modal.rate.edit': 'Edit Rate',
      'modal.rate.create': 'Create Rate',
      'btn.rate.create': 'Create rate',
      'btn.rate.update': 'Save changes',
      'btn.rate.delete': 'Delete rate',
      'modal.cats.title': 'Category Management',
      'cats.new.title': 'New Category',
      'btn.sync.now': 'Sync now',
      'channel.title': 'Channel settings',
      'channel.api.title': 'API settings',
      'channel.prop.title': 'Property mapping',
      'channel.monitor.title': 'Monitoring',
      'channel.system.title': 'System / Tech',
      'channel.admin.title': 'Admin',
    }
  };

  // Declarative map: what to translate (selectors -> key or function)
  const MAP = [
    // Top toolbar
    {sel:'#btnNew', key:'btn.new'},
    {sel:'#btnAvail', key:'btn.avail'},
    {sel:'#btnReporting', key:'btn.reporting'},
    {sel:'#btnSettings', key:'btn.settings'},
    {sel:'#btnSketch', key:'btn.sketch'},

    // KPI titles
    {sel:'.hero article:nth-of-type(1) .card-head h3', key:'kpi.today.title'},
    {sel:'.hero article:nth-of-type(2) .card-head h3', key:'kpi.next.title'},

    // KPI labels
    {sel:'.hero article:nth-of-type(1) .kpis .kpi:nth-child(1) .label', key:'kpi.today.bookings'},
    {sel:'.hero article:nth-of-type(1) .kpis .kpi:nth-child(2) .label', key:'kpi.today.revenue'},
    {sel:'.hero article:nth-of-type(1) .kpis .kpi:nth-child(3) .label', key:'kpi.today.adr'},
    {sel:'.hero article:nth-of-type(1) .kpis .kpi:nth-child(4) .label', key:'kpi.today.occ'},

    {sel:'.hero article:nth-of-type(2) .kpis .kpi:nth-child(1) .label', key:'kpi.next.revenue'},
    {sel:'.hero article:nth-of-type(2) .kpis .kpi:nth-child(2) .label', key:'kpi.next.adr'},
    {sel:'.hero article:nth-of-type(2) .kpis .kpi:nth-child(3) .label', key:'kpi.next.occ'},

    // Reservations block
    {sel:'section[aria-label="Reservierungen"] .card-head h3', key:'res.table.title'},
    {sel:'#searchInput', key:'res.filter.search', attr:'placeholder'},
    {sel:'#filterStatus option[value="active"]', key:'res.filter.status.active'},
    {sel:'#filterStatus option[value="done"]', key:'res.filter.status.done'},
    {sel:'#filterStatus option[value="canceled"]', key:'res.filter.status.canceled'},
    {sel:'#filterStatus option[value="all"]', key:'res.filter.status.all'},
    {sel:'#filterResNo', key:'res.filter.resno', attr:'placeholder'},
    {sel:'label[for="filterFrom"], #filterFrom', key:'res.filter.from', attrLabelOrPlaceholder:true},
    {sel:'label[for="filterTo"], #filterTo', key:'res.filter.to', attrLabelOrPlaceholder:true},
    {sel:'#btnRefresh', key:'btn.refresh'},
    {sel:'#btnClearFilters', key:'btn.reset'},
    {sel:'#resExportCsv', key:'btn.export.csv'},

    // Reservations table header
    {sel:'#resTable thead th:nth-child(1)', key:'res.table.th.resno'},
    {sel:'#resTable thead th:nth-child(2)', key:'res.table.th.hotel'},
    {sel:'#resTable thead th:nth-child(3)', key:'res.table.th.guest'},
    {sel:'#resTable thead th:nth-child(4)', key:'res.table.th.arr'},
    {sel:'#resTable thead th:nth-child(5)', key:'res.table.th.dep'},
    {sel:'#resTable thead th:nth-child(6)', key:'res.table.th.cat'},
    {sel:'#resTable thead th:nth-child(7)', key:'res.table.th.rate'},
    {sel:'#resTable thead th:nth-child(8)', key:'res.table.th.price'},
    {sel:'#resTable thead th:nth-child(9)', key:'res.table.th.status'},

    // New reservation modal (titles, steps)
    {sel:'#modalNew header h3', key:'modal.new.title'},
    {sel:'.wizard-steps .wstep[data-step="1"] b', key:'wiz.step1'},
    {sel:'.wizard-steps .wstep[data-step="2"] b', key:'wiz.step2'},
    {sel:'.wizard-steps .wstep[data-step="3"] b', key:'wiz.step3'},
    {sel:'.wizard-steps .wstep[data-step="4"] b', key:'wiz.step4'},
    // Step 1 labels
    {sel:'#w1 .form-col h4.section:nth-of-type(1)', key:'wiz.step1'},
    {sel:'#w1 .form-col .grid-compact label:nth-child(2)', key:'step1.arrival', asLabel:true},
    {sel:'#w1 .form-col .grid-compact label:nth-child(3)', key:'step1.departure', asLabel:true},
    {sel:'#w1 .form-col .grid-compact label:nth-child(4)', key:'step1.adults', asLabel:true},
    {sel:'#w1 .form-col .grid-compact label:nth-child(5)', key:'step1.children', asLabel:true},
    {sel:'#w1 .preview-col .box h4.section', key:'contact.email', custom(el,txt,lang){
      // We change only the box title; fields below get placeholders next:
      el.textContent = (lang==='en') ? 'Contact' : 'Kontaktdaten';
    }},
    {sel:'#newPhone', key:'contact.phone', attr:'placeholder'},
    {sel:'#newEmail', key:'contact.email', attr:'placeholder'},

    // Step 2
    {sel:'#w2 .s2-left .s2-label', key:'wiz.step2'},
    {sel:'#w2 .s2-facts .mono', key:'step2.facts'},
    {sel:'#w2 .s2-desc .mono', key:'step2.desc'},

    // Step 3
    {sel:'#w3 .policy-box .muted', key:'step3.policy'},

    // Step 4
    {sel:'#w4 .section:nth-of-type(1)', key:'step4.company'},
    {sel:'#w4 .section:nth-of-type(2)', key:'step4.cc'},
    {sel:'#w4 label.section', key:'step4.notes'},

    // Wizard buttons
    {sel:'#btnPrev', key:'btn.prev'},
    {sel:'#btnNext', key:'btn.next'},
    {sel:'#btnCreate', key:'btn.create'},

    // Edit modal
    {sel:'#modalEdit header h3', key:'modal.edit.title'},
    {sel:'#modalEdit .tabs .tab[data-tab="tabDet"]', key:'edit.tabs.details'},
    {sel:'#modalEdit .tabs .tab[data-tab="tabPlan"]', key:'edit.tabs.plan'},
    {sel:'#modalEdit .tabs .tab[data-tab="tabPay"]', key:'edit.tabs.pay'},
    {sel:'#modalEdit .tabs .tab[data-tab="tabAct"]', key:'edit.tabs.actions'},
    {sel:'label[for="editTotalPrice"]', key:'edit.total'},
    {sel:'#tabDet .lbl span:first-child', key:'edit.notes'},
    {sel:'#btnSaveEdit', key:'btn.save'},
    {sel:'#btnSavePay', key:'btn.save'},
    {sel:'#btnCancelRes', key:'btn.cancel'},
    {sel:'#btnResendConfirmation', key:'btn.resend'},

    // Availability
    {sel:'#modalAvail header h3', key:'modal.avail.title'},
    {sel:'#modalAvail .muted', key:'avail.legend', whichText:0}, // first muted span "Legende:"
    {sel:'#modalAvail .pill.occ-g', key:'avail.legend.g'},
    {sel:'#modalAvail .pill.occ-o', key:'avail.legend.o'},
    {sel:'#modalAvail .pill.occ-r', key:'avail.legend.r'},
    {sel:'#availRun', key:'btn.avail.update'},

    // Reporting
    {sel:'#modalReporting header h3', key:'modal.reporting.title'},
    {sel:'#repXls', key:'btn.export.xls'},
    {sel:'#repCsv', key:'btn.export.csv'},
    {sel:'#repPdf', key:'btn.export.pdf'},
    {sel:'h4.mono:contains("Umsatz pro Hotel")', key:'report.revenue'},
    {sel:'h4.mono:contains("Buchungen pro Hotel")', key:'report.bookings'},

    // Settings
    {sel:'#modalSettings header h3', key:'modal.settings.title'},
    {sel:'label .set-label:contains("Sprache")', key:'settings.lang'},
    {sel:'label .set-label:contains("Farbton")', key:'settings.hue'},
    {sel:'#btnUserPrefs', key:'settings.userprefs'},
    {sel:'#btnChannel', key:'settings.channel'},
    {sel:'#btnLog', key:'settings.log'},
    {sel:'#btnCats', key:'settings.cats'},
    {sel:'#btnRates', key:'settings.rates'},
    {sel:'#btnHelp', key:'settings.help'},
    {sel:'#btnSaveSettings', key:'settings.save'},
    {sel:'.set-sys h4.section', key:'sysinfo.title'},

    // Rate modals
    {sel:'#modalRateEdit header h3', key:'modal.rate.edit'},
    {sel:'#modalRateCreate header h3', key:'modal.rate.create'},
    {sel:'#btnRateCreate', key:'btn.rate.create'},
    {sel:'#btnRateUpdate', key:'btn.rate.update'},
    {sel:'#btnRateDelete', key:'btn.rate.delete'},

    // Cats modal
    {sel:'#modalCats header h3', key:'modal.cats.title'},
    {sel:'.cats-wrap .box h4.mono', key:'cats.new.title'},

    // Channel settings (tabs header)
    {sel:'#modalChannel header h3', key:'channel.title'},
    {sel:'.channel-tab[data-channel-tab="api"]', key:'channel.api.title'},
    {sel:'.channel-tab[data-channel-tab="property"]', key:'channel.prop.title'},
    {sel:'.channel-tab[data-channel-tab="monitor"]', key:'channel.monitor.title'},
    {sel:'.channel-tab[data-channel-tab="system"]', key:'channel.system.title'},
    {sel:'.channel-tab[data-channel-tab="admin"]', key:'channel.admin.title'},
    {sel:'#btnSyncNow', key:'btn.sync.now'},
  ];

  // Helpers
  function getLang(){ return localStorage.getItem(LS_KEY) || 'de'; }
  function setLang(v){ localStorage.setItem(LS_KEY, v); }
  function tr(key, lang){ return (I18N[lang] && I18N[lang][key]) || I18N.de[key] || ''; }

  // Query that supports :contains() for a few labels (fallback)
  function $(sel){
    if (!/:contains\(/.test(sel)) return document.querySelector(sel);
    const [before, text] = sel.split(':contains(');
    const needle = text.replace(/\)$/, '').replace(/^["']|["']$/g,'');
    const list = Array.from(document.querySelectorAll(before.trim()));
    return list.find(el => (el.textContent||'').includes(needle)) || null;
  }

  function applyI18n(lang){
    // Toolbar/status simple bits
    MAP.forEach(m=>{
      const el = $(m.sel);
      if (!el) return;
      const txt = tr(m.key, lang);
      if (m.custom) return m.custom(el, txt, lang);
      if (m.attr) { el.setAttribute(m.attr, txt); return; }
      if (m.attrLabelOrPlaceholder){
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')
          el.setAttribute('placeholder', txt);
        else el.textContent = txt;
        return;
      }
      if (m.asLabel){
        // Many labels use: <label>Text <input/></label>
        // Replace only the first text node
        const tn = Array.from(el.childNodes).find(n=>n.nodeType===3);
        if (tn) tn.nodeValue = txt + ' ';
        else el.prepend(document.createTextNode(txt+' '));
        return;
      }
      if (m.whichText != null){
        const node = el; // pick nth text span if needed
        el.textContent = txt;
        return;
      }
      el.textContent = txt;
    });

    // Language select reflect current (so UI shows "Deutsch"/"English")
    const sel = document.getElementById('selLang');
    if (sel){
      sel.value = lang;
      // Option labels stay localized (Deutsch/English), no change needed
    }

    // de:
'dock.toggle': 'Ein-/Ausblenden',

// en:
'dock.toggle': 'Collapse/Expand',


    // Small things: table headers in Reporting modal (if present)
    const repHead = document.querySelector('#modalReporting thead tr');
    if (repHead && lang==='en'){
      const map = ['Hotel','Bookings','Revenue','ADR','Occupancy'];
      Array.from(repHead.children).forEach((th,i)=> th.textContent = map[i] || th.textContent);
    }
    if (repHead && lang==='de'){
      const map = ['Hotel','Buchungen','Umsatz','ADR','Belegungsrate'];
      Array.from(repHead.children).forEach((th,i)=> th.textContent = map[i] || th.textContent);
    }
  }

  // Wire up
  function initI18n(){
    const lang = getLang();
    applyI18n(lang);
    const sel = document.getElementById('selLang');
    if (sel && !sel.__i18nBound){
      sel.__i18nBound = true;
      sel.addEventListener('change', e=>{
        const v = e.target.value === 'en' ? 'en' : 'de';
        setLang(v);
        applyI18n(v);
      });
    }
  }

  // Public (optional)
  window.resToolI18n = { apply: applyI18n, getLang, setLang };

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
  } else {
    initI18n();
  }
})();

