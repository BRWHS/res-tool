
/* res-tool i18n (DE/EN) – full coverage */
(function(){
  const LS_KEY = 'resTool.lang';

  /* ---------- Wörterbuch ---------- */
  const I18N = {
    de: {
      // Toolbar & Dashboard
      'btn.new':'Neue Reservierung','btn.avail':'Verfügbarkeit','btn.reporting':'Reporting','btn.settings':'Einstellungen','btn.sketch':'Hotelskizze',
      'kpi.today.title':'Performance - Heute','kpi.today.bookings':'Buchungen (heute eingegangen)','kpi.today.revenue':'Umsatz (heute)','kpi.today.adr':'ADR (heute)','kpi.today.occ':'Auslastung (heute)',
      'kpi.next.title':'Performance - Nächste 7 Tage','kpi.next.revenue':'Umsatz (Anreisen +1..+7)','kpi.next.adr':'WDR (+1..+7)','kpi.next.occ':'Ø Auslastung (+1..+7)',
      // Reservations list
      'res.title':'Reservierungen',
      'res.th.resno':'Res.-Nr.','res.th.hotel':'Hotel','res.th.guest':'Gastname','res.th.arr':'Anreise','res.th.dep':'Abreise','res.th.cat':'Kategorie','res.th.rate':'Rate','res.th.price':'Preis','res.th.status':'Status',
      'res.ph.search':'Gastname…','res.ph.resno':'Res.-Nr.','res.filter.status.active':'Status: Active (Zukunft)','res.filter.status.done':'Status: Done (Vergangenheit)','res.filter.status.canceled':'Status: Canceled','res.filter.status.all':'Status: Alle',
      'btn.refresh':'Refresh','btn.reset':'Reset','btn.export.csv':'Export CSV',
      'pager.prev':'Zurück','pager.next':'Weiter','pager.page':'Seite','pager.entries':'Einträge',
      // Quick links
      'ql.book':'Buchungs-Tracker','ql.call':'Telefon-Tracker','ql.manual':'Handbuch',
      // Generic
      'btn.close':'Schließen','btn.abort':'Abbrechen','btn.update':'Aktualisieren','btn.apply':'Übernehmen','btn.save':'Speichern','btn.delete':'Löschen','btn.create':'Erstellen',
      // New Reservation modal
      'modal.new':'Neue Reservierung','wiz.step1':'Hotel & Daten','wiz.step2':'Kategorie','wiz.step3':'Rate','wiz.step4':'Gast & Zahlung',
      'stay.title':'Aufenthaltsdaten','guest.title':'Gästedaten',
      'lab.hotel':'Hotel','lab.arrival':'Anreise','lab.departure':'Abreise','lab.adults':'Erwachsene','lab.children':'Kinder',
      'lab.fname':'Vorname','lab.lname':'Nachname*','lab.zip':'PLZ','lab.street':'Straße','lab.city':'Ort',
      'contact.box':'Kontaktdaten','ph.phone':'Telefon','ph.email':'E-Mail',
      's2.facts':'Fakten','s2.desc':'Beschreibung',
      's3.policy':'Stornobedingung',
      's4.company':'Firma (optional)','s4.cc':'Kreditkarte','s4.notes':'Notizen',
      'sum.guest':'Gastdaten',
      'cc.holder':'Karteninhaber','cc.number':'Kartennummer','cc.expiry':'Ablauf (MM/JJ)',
      'btn.prev':'Zurück','btn.next':'Weiter','btn.create.res':'Reservierung abschicken',
      // Edit Reservation
      'modal.edit':'Reservierung bearbeiten','tab.details':'Details','tab.plan':'Preisplan','tab.pay':'Zahlungskonto','tab.act':'Aktionen',
      'lab.resno':'Res.-Nr.','lab.status':'Status','lab.guestlname':'Gast Nachname','lab.category':'Kategorie','lab.rate':'Rate',
      'lab.total':'Gesamtpreis','lab.notes':'Notizen','notes.hint':'(intern)',
      'btn.cancel.res':'Stornieren','btn.resend':'Bestätigung erneut senden',
      'plan.title':'Preisplan (pro Nacht)','plan.weekdays':'Wochentage-Muster','plan.allprice':'💰All Price','plan.reset':'Zurücksetzen','plan.save':'Preisplan speichern',
      'plan.all.popup.title':'Alle Nächte auf Preis setzen','plan.all.placeholder':'z. B. 109.00','plan.all.cancel':'Abbrechen','plan.all.apply':'Preise setzen',
      // Availability
      'modal.avail':'Verfügbarkeit','lab.from':'Von','lab.to':'Bis','lab.days':'Tage','avail.legend':'Legende:','avail.g':'≤64%','avail.o':'65–89%','avail.r':'≥90%',
      // Reporting
      'modal.report':'Reporting','report.h1':'Umsatz pro Hotel','report.h2':'Buchungen pro Hotel',
      'rep.th.hotel':'Hotel','rep.th.bookings':'Buchungen','rep.th.revenue':'Umsatz','rep.th.adr':'ADR','rep.th.occ':'Belegungsrate',
      'btn.export.xls':'Export Excel','btn.export.csv':'Export CSV','btn.export.pdf':'Export PDF',
      // Settings
      'modal.settings':'Einstellungen','set.lang':'Sprache','set.hue':'Farbton (Hue)','set.save':'Einstellungen speichern',
      'set.userprefs':'Benutzereinstellungen','set.channel':'Channel – Einstellungen','set.log':'Log Activity','set.cats':'Kategorieverwaltung','set.rates':'Rateneinstellungen','set.help':'Hilfe & FAQ',
      'sysinfo':'Live-Systeminfo','sys.ip':'Öffentliche IP','sys.ipv4':'IPv4','sys.loc':'Standort','sys.os':'OS / Browser','sys.live':'Live Daten.',
      // User Prefs
      'modal.userprefs':'Benutzereinstellungen','userprefs.placeholder':'Platzhalter für persönliche Einstellungen (z. B. Standardhotel, Standardzeitraum, Shortcuts …).',
      // Rates (create/edit & board)
      'modal.rate.edit':'Rate bearbeiten','modal.rate.create':'Neue Rate',
      'lab.ratecode':'Ratecode (nur Zahlen)','lab.ratetype':'Ratentyp*','lab.ratehotel':'Hotel*','lab.ratename':'Ratename*','lab.cats':'Kategorien','lab.policy':'Stornobedingung','lab.price':'Preis/Nacht (€)','lab.mapped':'Gemappt',
      'btn.rate.create':'Rate erstellen','btn.rate.update':'Änderungen speichern','btn.rate.delete':'Rate löschen',
      'rates.modal':'Rateneinstellungen','rates.new':'+ Neue Rate','rates.search.ph':'Suchen: Name oder Ratecode','rates.filter.hotel':'Hotel filtern',
      'rates.tab.direct':'Direct-Rate','rates.tab.corp':'Corp-Rate','rates.tab.ids':'IDS-Rate',
      'rates.th.code':'Ratecode','rates.th.name':'Name','rates.th.hotel':'Hotel','rates.th.cats':'Kategorien','rates.th.price':'Preis','rates.th.mapped':'Mapped','rates.hint.max':'Max. 50 Einträge werden angezeigt.',
      // Categories
      'modal.cats':'Kategorieverwaltung','cats.hotel':'Hotel','cats.search':'Suche','cats.search.ph':'Suche: Code/Name','cats.new':'Neue Kategorie',
      'lab.cat.code':'Code','lab.cat.max':'Max. Pers.','lab.cat.name':'Name','cats.btn.add':'Hinzufügen','cats.hint':'Max. 50 Einträge pro Seite.',
      'cats.th.code':'Code','cats.th.name':'Name','cats.th.max':'Max. Pers.','cats.th.actions':'Aktionen',
      'cats.title.table':'Kategorien','cats.count':'Einträge',
      // Channel
      'modal.channel':'Channel – Einstellungen','ch.areas':'Bereiche',
      'tab.api':'API – Einstellungen','tab.prop':'Property – Mapping','tab.monitor':'Monitoring','tab.system':'System – Technik','tab.admin':'Admin',
      'ch.api.title':'API – Einstellungen','ch.api.key':'API-Key (versteckt)','ch.api.secret':'API-Secret (versteckt)','ch.api.prod':'HNS Endpoint – PROD','ch.api.test':'HNS Endpoint – TEST',
      'ch.api.timeout':'Timeout (ms)','ch.api.retry':'Retry-Versuche','ch.api.map':'Hotel-Mapping (JSON: unsere hotel_code → HNS-Code)',
      'ch.prop.hotels':'Hotels aktiv','ch.prop.catmap':'Kategorien-Mapping (JSON: unsere Kategorie → HNS)','ch.prop.ratemap':'Raten-Mapping (JSON: unser Ratecode → HNS-Ratecode)',
      'ch.mon.title':'Monitoring','ch.mon.status':'Status:','ch.mon.errors':'Error-Log (letzte 10)','ch.mon.map':'Mapping-Übersicht',
      'ch.sys.title':'System – Technik','ch.sys.mode':'Modus','ch.sys.export':'Export Settings (JSON)','ch.sys.import':'Import JSON',
      'ch.sys.add.title':'Hotel hinzufügen (on-the-fly)','ch.sys.code':'Code','ch.sys.name':'Name','ch.sys.group':'Gruppe','ch.sys.img':'Bild-URL','ch.sys.btn.add':'Hotel hinzufügen',
      'ch.sys.cancelpol':'Stornierungsbedingungen (Default, Markdown/Plain)','btn.sync':'Jetzt synchronisieren','btn.save.channel':'Einstellungen speichern',
      'admin.title':'Admin','admin.protect':'Passwortschutz','admin.protect.on':'ist aktiv (Prompt)','admin.lastsync':'Letzter Sync',
      'ch.info':'', // Fußzeile Info
      // Log
      'modal.log':'Log Activity','log.ph.search':'Suche… (Text/Meta)','log.type.all':'Typ: Alle','log.th.time':'Datum/Zeit','log.th.user':'Benutzer','log.th.type':'Typ','log.th.action':'Aktion','log.th.details':'Details',
      // Help & FAQ
      'modal.help':'Hilfe & FAQ','help.quick':'Schnelle Antworten',
      'help.q1':'Wie lege ich eine neue Reservierung an?','help.a1':'Oben „Neue Reservierung“ → Schritt 1–4 durchklicken, dann „Reservierung abschicken“.',
      'help.q2':'Woher kommen Verfügbarkeiten?','help.a2':'Aus der Tabelle availability (Supabase). HNS-Anbindung folgt.',
      'help.q3':'Werden Systeminfos gespeichert?','help.a3':'Nein. IP/Standort/OS werden nur lokal angezeigt.',
      // Sketch
      'modal.sketch':'Hotelskizze','sketch.hotels':'Hotels','sketch.choose':'Bitte Hotel wählen','sketch.pill':'Skizze',
      // Email confirmation popup
      'confirm.title':'Reservierungsbestätigung versenden','confirm.to':'Empfänger-E-Mail','confirm.body':'Nachricht (bearbeitbar)',
      'confirm.copy.mail':'E-Mail kopieren','confirm.copy.text':'Text kopieren','confirm.abort':'Abbrechen','confirm.send':'Reservierungsbestätigung versenden',
    },
    en: {
      // Toolbar & Dashboard
      'btn.new':'New Reservation','btn.avail':'Availability','btn.reporting':'Reporting','btn.settings':'Settings','btn.sketch':'Hotel Sketch',
      'kpi.today.title':'Performance - Today','kpi.today.bookings':'Bookings (received today)','kpi.today.revenue':'Revenue (today)','kpi.today.adr':'ADR (today)','kpi.today.occ':'Occupancy (today)',
      'kpi.next.title':'Performance - Next 7 Days','kpi.next.revenue':'Revenue (arrivals +1..+7)','kpi.next.adr':'ADR (+1..+7)','kpi.next.occ':'Avg. Occupancy (+1..+7)',
      // Reservations list
      'res.title':'Reservations',
      'res.th.resno':'Res. No.','res.th.hotel':'Hotel','res.th.guest':'Guest name','res.th.arr':'Arrival','res.th.dep':'Departure','res.th.cat':'Category','res.th.rate':'Rate','res.th.price':'Price','res.th.status':'Status',
      'res.ph.search':'Guest name…','res.ph.resno':'Res. No.','res.filter.status.active':'Status: Active (future)','res.filter.status.done':'Status: Done (past)','res.filter.status.canceled':'Status: Canceled','res.filter.status.all':'Status: All',
      'btn.refresh':'Refresh','btn.reset':'Reset','btn.export.csv':'Export CSV',
      'pager.prev':'Back','pager.next':'Next','pager.page':'Page','pager.entries':'entries',
      // Quick links
      'ql.book':'Booking tracker','ql.call':'Call tracker','ql.manual':'Manual',
      // Generic
      'btn.close':'Close','btn.abort':'Cancel','btn.update':'Update','btn.apply':'Apply','btn.save':'Save','btn.delete':'Delete','btn.create':'Create',
      // New Reservation modal
      'modal.new':'New Reservation','wiz.step1':'Hotel & Dates','wiz.step2':'Category','wiz.step3':'Rate','wiz.step4':'Guest & Payment',
      'stay.title':'Stay data','guest.title':'Guest data',
      'lab.hotel':'Hotel','lab.arrival':'Arrival','lab.departure':'Departure','lab.adults':'Adults','lab.children':'Children',
      'lab.fname':'First name','lab.lname':'Last name*','lab.zip':'ZIP','lab.street':'Street','lab.city':'City',
      'contact.box':'Contact','ph.phone':'Phone','ph.email':'Email',
      's2.facts':'Facts','s2.desc':'Description',
      's3.policy':'Cancellation policy',
      's4.company':'Company (optional)','s4.cc':'Credit Card','s4.notes':'Notes',
      'sum.guest':'Guest data',
      'cc.holder':'Card holder','cc.number':'Card number','cc.expiry':'Expiry (MM/YY)',
      'btn.prev':'Back','btn.next':'Next','btn.create.res':'Submit reservation',
      // Edit Reservation
      'modal.edit':'Edit Reservation','tab.details':'Details','tab.plan':'Price Plan','tab.pay':'Payment','tab.act':'Actions',
      'lab.resno':'Res. No.','lab.status':'Status','lab.guestlname':'Guest last name','lab.category':'Category','lab.rate':'Rate',
      'lab.total':'Total price','lab.notes':'Notes','notes.hint':'(internal)',
      'btn.cancel.res':'Cancel reservation','btn.resend':'Resend confirmation',
      'plan.title':'Price plan (per night)','plan.weekdays':'Weekday pattern','plan.allprice':'💰All Price','plan.reset':'Reset','plan.save':'Save price plan',
      'plan.all.popup.title':'Set all nights to price','plan.all.placeholder':'e.g. 109.00','plan.all.cancel':'Cancel','plan.all.apply':'Set prices',
      // Availability
      'modal.avail':'Availability','lab.from':'From','lab.to':'To','lab.days':'Days','avail.legend':'Legend:','avail.g':'≤64%','avail.o':'65–89%','avail.r':'≥90%',
      // Reporting
      'modal.report':'Reporting','report.h1':'Revenue by hotel','report.h2':'Bookings by hotel',
      'rep.th.hotel':'Hotel','rep.th.bookings':'Bookings','rep.th.revenue':'Revenue','rep.th.adr':'ADR','rep.th.occ':'Occupancy',
      'btn.export.xls':'Export Excel','btn.export.csv':'Export CSV','btn.export.pdf':'Export PDF',
      // Settings
      'modal.settings':'Settings','set.lang':'Language','set.hue':'Hue (color)','set.save':'Save settings',
      'set.userprefs':'User preferences','set.channel':'Channel settings','set.log':'Log Activity','set.cats':'Category Management','set.rates':'Rate settings','set.help':'Help & FAQ',
      'sysinfo':'Live system info','sys.ip':'Public IP','sys.ipv4':'IPv4','sys.loc':'Location','sys.os':'OS / Browser','sys.live':'Live data.',
      // User Prefs
      'modal.userprefs':'User preferences','userprefs.placeholder':'Placeholder for personal settings (e.g., default hotel, default period, shortcuts …).',
      // Rates
      'modal.rate.edit':'Edit Rate','modal.rate.create':'Create Rate',
      'lab.ratecode':'Ratecode (numbers only)','lab.ratetype':'Rate type*','lab.ratehotel':'Hotel*','lab.ratename':'Rate name*','lab.cats':'Categories','lab.policy':'Cancellation policy','lab.price':'Price / night (€)','lab.mapped':'Mapped',
      'btn.rate.create':'Create rate','btn.rate.update':'Save changes','btn.rate.delete':'Delete rate',
      'rates.modal':'Rate settings','rates.new':'+ New Rate','rates.search.ph':'Search: Name or Ratecode','rates.filter.hotel':'Filter hotel',
      'rates.tab.direct':'Direct rate','rates.tab.corp':'Corp rate','rates.tab.ids':'IDS rate',
      'rates.th.code':'Ratecode','rates.th.name':'Name','rates.th.hotel':'Hotel','rates.th.cats':'Categories','rates.th.price':'Price','rates.th.mapped':'Mapped','rates.hint.max':'Max. 50 entries shown.',
      // Categories
      'modal.cats':'Category Management','cats.hotel':'Hotel','cats.search':'Search','cats.search.ph':'Search: Code/Name','cats.new':'New Category',
      'lab.cat.code':'Code','lab.cat.max':'Max. guests','lab.cat.name':'Name','cats.btn.add':'Add','cats.hint':'Max. 50 entries per page.',
      'cats.th.code':'Code','cats.th.name':'Name','cats.th.max':'Max. guests','cats.th.actions':'Actions',
      'cats.title.table':'Categories','cats.count':'entries',
      // Channel
      'modal.channel':'Channel settings','ch.areas':'Sections',
      'tab.api':'API settings','tab.prop':'Property mapping','tab.monitor':'Monitoring','tab.system':'System / Tech','tab.admin':'Admin',
      'ch.api.title':'API settings','ch.api.key':'API key (hidden)','ch.api.secret':'API secret (hidden)','ch.api.prod':'HNS endpoint – PROD','ch.api.test':'HNS endpoint – TEST',
      'ch.api.timeout':'Timeout (ms)','ch.api.retry':'Retry attempts','ch.api.map':'Hotel mapping (JSON: our hotel_code → HNS code)',
      'ch.prop.hotels':'Active hotels','ch.prop.catmap':'Category mapping (JSON: our category → HNS)','ch.prop.ratemap':'Rate mapping (JSON: our ratecode → HNS ratecode)',
      'ch.mon.title':'Monitoring','ch.mon.status':'Status:','ch.mon.errors':'Error log (last 10)','ch.mon.map':'Mapping overview',
      'ch.sys.title':'System / Tech','ch.sys.mode':'Mode','ch.sys.export':'Export settings (JSON)','ch.sys.import':'Import JSON',
      'ch.sys.add.title':'Add hotel (on the fly)','ch.sys.code':'Code','ch.sys.name':'Name','ch.sys.group':'Group','ch.sys.img':'Image URL','ch.sys.btn.add':'Add hotel',
      'ch.sys.cancelpol':'Cancellation policy (default, Markdown/Plain)','btn.sync':'Sync now','btn.save.channel':'Save settings',
      'admin.title':'Admin','admin.protect':'Password protection','admin.protect.on':'enabled (prompt)','admin.lastsync':'Last sync',
      'ch.info':'',
      // Log
      'modal.log':'Log Activity','log.ph.search':'Search… (text/meta)','log.type.all':'Type: All','log.th.time':'Date/Time','log.th.user':'User','log.th.type':'Type','log.th.action':'Action','log.th.details':'Details',
      // Help & FAQ
      'modal.help':'Help & FAQ','help.quick':'Quick answers',
      'help.q1':'How do I create a reservation?','help.a1':'Top “New Reservation” → go through steps 1–4, then “Submit reservation”.',
      'help.q2':'Where does availability come from?','help.a2':'From the table availability (Supabase). HNS integration will follow.',
      'help.q3':'Are system infos stored?','help.a3':'No. IP/Location/OS are displayed locally only.',
      // Sketch
      'modal.sketch':'Hotel sketch','sketch.hotels':'Hotels','sketch.choose':'Please select a hotel','sketch.pill':'Sketch',
      // Email confirmation popup
      'confirm.title':'Send reservation confirmation','confirm.to':'Recipient email','confirm.body':'Message (editable)',
      'confirm.copy.mail':'Copy email','confirm.copy.text':'Copy text','confirm.abort':'Cancel','confirm.send':'Send reservation confirmation',
    }
  };

  /* ---------- kleine Utils ---------- */
  function tr(key, lang){ return (I18N[lang] && I18N[lang][key]) || I18N.de[key] || ''; }
  function getLang(){ return localStorage.getItem(LS_KEY) || 'de'; }
  function setLang(v){ localStorage.setItem(LS_KEY, v); }

  function setText(sel, key, lang){
    const el = document.querySelector(sel);
    if (!el) return;
    el.textContent = tr(key, lang);
  }
  function setPlaceholder(sel, key, lang){
    const el = document.querySelector(sel);
    if (!el) return;
    el.setAttribute('placeholder', tr(key, lang));
  }
  // robustes Label-Mapping: Input-ID → Label-Textnode
  function setLabelByInputId(id, key, lang){
    const input = document.getElementById(id);
    if (!input) return;
    const candidate = input.closest && input.closest('label');
    const parentIsLabel = input.parentElement && input.parentElement.tagName === 'LABEL';
    const label = candidate ? candidate : (parentIsLabel ? input.parentElement : null);
    if (!label) return;
    const txt = tr(key, lang);
    const tn = Array.from(label.childNodes).find(n => n.nodeType === 3);
    if (tn) tn.nodeValue = txt + ' ';
    else label.prepend(document.createTextNode(txt + ' '));
  }
  function setTableHeads(rowSel, keys, lang){
    const ths = document.querySelectorAll(rowSel);
    if (!ths || !ths.length) return;
    ths.forEach((th,i)=> { if (keys[i]) th.textContent = tr(keys[i], lang); });
  }
  function replaceTextContains(selector, needle, key, lang){
    document.querySelectorAll(selector).forEach(el=>{
      if ((el.textContent||'').includes(needle)) el.textContent = tr(key, lang);
    });
  }

  /* ---------- Hauptroutine ---------- */
  function applyI18n(lang){
    // Toolbar
    setText('#btnNew','btn.new',lang); setText('#btnAvail','btn.avail',lang); setText('#btnReporting','btn.reporting',lang); setText('#btnSettings','btn.settings',lang); setText('#btnSketch','btn.sketch',lang);

    // KPI Titles & Labels
    setText('.hero article:nth-of-type(1) .card-head h3','kpi.today.title',lang);
    setText('.hero article:nth-of-type(2) .card-head h3','kpi.next.title',lang);
    setText('.hero article:nth-of-type(1) .kpis .kpi:nth-child(1) .label','kpi.today.bookings',lang);
    setText('.hero article:nth-of-type(1) .kpis .kpi:nth-child(2) .label','kpi.today.revenue',lang);
    setText('.hero article:nth-of-type(1) .kpis .kpi:nth-child(3) .label','kpi.today.adr',lang);
    setText('.hero article:nth-of-type(1) .kpis .kpi:nth-child(4) .label','kpi.today.occ',lang);
    setText('.hero article:nth-of-type(2) .kpis .kpi:nth-child(1) .label','kpi.next.revenue',lang);
    setText('.hero article:nth-of-type(2) .kpis .kpi:nth-child(2) .label','kpi.next.adr',lang);
    setText('.hero article:nth-of-type(2) .kpis .kpi:nth-child(3) .label','kpi.next.occ',lang);

    // Reservations – title, filters, table
    setText('section[aria-label="Reservierungen"] .card-head h3','res.title',lang);
    setPlaceholder('#searchInput','res.ph.search',lang);
    setPlaceholder('#filterResNo','res.ph.resno',lang);
    setText('#filterStatus option[value="active"]','res.filter.status.active',lang);
    setText('#filterStatus option[value="done"]','res.filter.status.done',lang);
    setText('#filterStatus option[value="canceled"]','res.filter.status.canceled',lang);
    setText('#filterStatus option[value="all"]','res.filter.status.all',lang);
    setText('#btnRefresh','btn.refresh',lang); setText('#btnClearFilters','btn.reset',lang); setText('#resExportCsv','btn.export.csv',lang);
    setTableHeads('#resTable thead th', ['res.th.resno','res.th.hotel','res.th.guest','res.th.arr','res.th.dep','res.th.cat','res.th.rate','res.th.price','res.th.status'], lang);
    setText('#prevPage','pager.prev',lang); setText('#nextPage','pager.next',lang);
    const pi = document.getElementById('pageInfo'); if (pi) pi.textContent = pi.textContent.replace(/Seite|Page/, tr('pager.page',lang));

    // Quick links
    setText('.quick-links a:nth-child(1)','ql.book',lang);
    setText('.quick-links a:nth-child(2)','ql.call',lang);
    setText('.quick-links a:nth-child(3)','ql.manual',lang);

    // Generic close buttons in modals
    document.querySelectorAll('section.modal header button[data-close]').forEach(b=> b.textContent = tr('btn.close', lang));

    // NEW RESERVATION
    setText('#modalNew header h3','modal.new',lang);
    setText('.wizard-steps .wstep[data-step="1"] b','wiz.step1',lang);
    setText('.wizard-steps .wstep[data-step="2"] b','wiz.step2',lang);
    setText('.wizard-steps .wstep[data-step="3"] b','wiz.step3',lang);
    setText('.wizard-steps .wstep[data-step="4"] b','wiz.step4',lang);
    // step 1 titles
    setText('#w1 .form-col h4.section','stay.title',lang);
    replaceTextContains('#w1 .form-col h4.section','Gästedaten','guest.title',lang);
    // step 1 labels by ID
    ['newHotel','newArr','newDep','newAdults','newChildren','newFname','newLname','newZip','newStreet','newCity'].forEach(id=>{
      const map = {newHotel:'lab.hotel',newArr:'lab.arrival',newDep:'lab.departure',newAdults:'lab.adults',newChildren:'lab.children',newFname:'lab.fname',newLname:'lab.lname',newZip:'lab.zip',newStreet:'lab.street',newCity:'lab.city'};
      setLabelByInputId(id, map[id], lang);
    });
    // Kontaktbox
    setText('#w1 .preview-col .box h4.section','contact.box',lang);
    setLabelByInputId('newPhone','ph.phone',lang); setPlaceholder('#newPhone','ph.phone',lang);
    setLabelByInputId('newEmail','ph.email',lang); setPlaceholder('#newEmail','ph.email',lang);

    // step 2/3/4 texts
    setText('#w2 .s2-facts .mono','s2.facts',lang);
    setText('#w2 .s2-desc .mono','s2.desc',lang);
    setText('#w3 .policy-box .muted','s3.policy',lang);
    setText('#w4 .section:nth-of-type(1)','s4.company',lang);
    setText('#w4 .section:nth-of-type(2)','s4.cc',lang);
    setText('#w4 label.section','s4.notes',lang);
    // step 4: credit card labels
    setText('#w4 h4.section','sum.guest',lang); // first H4 becomes "Guest data"/"Gastdaten"
    setLabelByInputId('ccHolder','cc.holder',lang);
    setLabelByInputId('ccNumber','cc.number',lang);
    setLabelByInputId('ccExpiry','cc.expiry',lang);

    // wizard buttons
    setText('#btnPrev','btn.prev',lang); setText('#btnNext','btn.next',lang); setText('#btnCreate','btn.create.res',lang);

    // EDIT RESERVATION
    setText('#modalEdit header h3','modal.edit',lang);
    setText('#modalEdit .tabs .tab[data-tab="tabDet"]','tab.details',lang);
    setText('#modalEdit .tabs .tab[data-tab="tabPlan"]','tab.plan',lang);
    setText('#modalEdit .tabs .tab[data-tab="tabPay"]','tab.pay',lang);
    setText('#modalEdit .tabs .tab[data-tab="tabAct"]','tab.act',lang);
    ['eResNo','eStatus','eHotel','eLname','eArr','eDep','eCat','eRate'].forEach(id=>{
      const map = {eResNo:'lab.resno',eStatus:'lab.status',eHotel:'lab.hotel',eLname:'lab.guestlname',eArr:'lab.arrival',eDep:'lab.departure',eCat:'lab.category',eRate:'lab.rate'};
      setLabelByInputId(id, map[id], lang);
    });
    setText('label[for="editTotalPrice"]','lab.total',lang);
    const notesLbl = document.querySelector('#tabDet .lbl span:first-child'); if (notesLbl) notesLbl.textContent = tr('lab.notes',lang);
    const hint = document.querySelector('#tabDet .lbl .tiny'); if (hint) hint.textContent = tr('notes.hint',lang);
    setText('#btnSaveEdit','btn.save',lang); setText('#btnSavePay','btn.save',lang); setText('#btnCancelRes','btn.cancel.res',lang); setText('#btnResendConfirmation','btn.resend',lang);

    // Edit – Price plan tab
    replaceTextContains('#tabPlan .mono','Preisplan','plan.title',lang);
    setText('#btnPlanFillWeekdays','plan.weekdays',lang);
    setText('#btnPlanAll','plan.allprice',lang);
    setText('#btnPlanReset','plan.reset',lang);
    setText('#btnSavePlan','plan.save',lang);
    // All price popup
    const pop = document.getElementById('planAllPopup');
    if (pop){
      replaceTextContains('#planAllPopup .mono','Alle Nächte','plan.all.popup.title',lang);
      document.getElementById('planAllValue')?.setAttribute('placeholder', tr('plan.all.placeholder',lang));
      setText('#planAllCancel','plan.all.cancel',lang);
      setText('#planAllApply','plan.all.apply',lang);
    }

    // AVAILABILITY
    setText('#modalAvail header h3','modal.avail',lang);
    setLabelByInputId('availFrom','lab.from',lang);
    setLabelByInputId('availDays','lab.days',lang);
    setText('#availRun','btn.update',lang);
    const avLegend = document.querySelector('#modalAvail .body .muted'); if (avLegend) avLegend.textContent = tr('avail.legend',lang);
    setText('#modalAvail .pill.occ-g','avail.g',lang); setText('#modalAvail .pill.occ-o','avail.o',lang); setText('#modalAvail .pill.occ-r','avail.r',lang);
    // Matrix sticky head
    replaceTextContains('#modalAvail thead th.sticky','Hotel','rep.th.hotel',lang);

    // REPORTING
    setText('#modalReporting header h3','modal.report',lang);
    setLabelByInputId('repFrom','lab.from',lang);
    setLabelByInputId('repTo','lab.to',lang);
    setLabelByInputId('repHotel','lab.hotel',lang);
    setText('#repXls','btn.export.xls',lang); setText('#repCsv','btn.export.csv',lang); setText('#repPdf','btn.export.pdf',lang);
    setText('#modalReporting .chart-card:nth-child(1) h4','report.h1',lang);
    setText('#modalReporting .chart-card:nth-child(2) h4','report.h2',lang);
    setTableHeads('#modalReporting thead th', ['rep.th.hotel','rep.th.bookings','rep.th.revenue','rep.th.adr','rep.th.occ'], lang);

    // SETTINGS
    setText('#modalSettings header h3','modal.settings',lang);
    replaceTextContains('.set-label','Sprache','set.lang',lang);
    replaceTextContains('.set-label','Farbton','set.hue',lang);
    setText('#btnUserPrefs','set.userprefs',lang); setText('#btnChannel','set.channel',lang); setText('#btnLog','set.log',lang); setText('#btnCats','set.cats',lang); setText('#btnRates','set.rates',lang); setText('#btnHelp','set.help',lang);
    setText('#btnSaveSettings','set.save',lang);
    setText('.set-sys h4.section','sysinfo',lang);
    replaceTextContains('.settings-row label','Öffentliche IP','sys.ip',lang);
    replaceTextContains('.settings-row label','IPv4','sys.ipv4',lang);
    replaceTextContains('.settings-row label','Standort','sys.loc',lang);
    replaceTextContains('.settings-row label','OS / Browser','sys.os',lang);
    replaceTextContains('.set-sys .muted.tiny','Live','sys.live',lang);

    // USER PREFS
    setText('#modalUserPrefs header h3','modal.userprefs',lang);
    replaceTextContains('#modalUserPrefs .box p.muted','Platzhalter','userprefs.placeholder',lang);

    // RATES (create + edit modals)
    setText('#modalRateEdit header h3','modal.rate.edit',lang);
    setText('#modalRateCreate header h3','modal.rate.create',lang);
    ['erHotel','erCode','erType','erName','erPolicy','erPrice','erMapped'].forEach(id=>{
      const map = {erHotel:'lab.ratehotel',erCode:'lab.ratecode',erType:'lab.ratetype',erName:'lab.ratename',erPolicy:'lab.policy',erPrice:'lab.price',erMapped:'lab.mapped'};
      setLabelByInputId(id, map[id], lang);
    });
    ['crCode','crType','crHotel','crName','crPolicy','crPrice','crMapped'].forEach(id=>{
      const map = {crCode:'lab.ratecode',crType:'lab.ratetype',crHotel:'lab.ratehotel',crName:'lab.ratename',crPolicy:'lab.policy',crPrice:'lab.price',crMapped:'lab.mapped'};
      setLabelByInputId(id, map[id], lang);
    });
    // Category stacks labels
    replaceTextContains('label[style*="grid-column:1 / -1"]','Kategorien','lab.cats',lang);
    setText('#btnRateCreate','btn.rate.create',lang);
    setText('#btnRateUpdate','btn.rate.update',lang);
    setText('#btnRateDelete','btn.rate.delete',lang);

    // RATES board (modalRates)
    setText('#ratesTitle','rates.modal',lang);
    setText('#rsNewRate','rates.new',lang);
    setPlaceholder('#rsSearch','rates.search.ph',lang);
    document.getElementById('rsHotelFilter')?.setAttribute('title', tr('rates.filter.hotel',lang));
    setText('#rsTabDirect','rates.tab.direct',lang);
    setText('#rsTabCorp','rates.tab.corp',lang);
    setText('#rsTabIds','rates.tab.ids',lang);
    setTableHeads('#ratesBoard thead th', ['rates.th.code','rates.th.name','rates.th.hotel','rates.th.cats','rates.th.price','rates.th.mapped'], lang);
    replaceTextContains('#ratesBoard .muted.tiny','Max. 50','rates.hint.max',lang);
    replaceTextContains('#rsTitle','Raten – Direct','rates.tab.direct',lang);

    // CATEGORIES
    setText('#modalCats header h3','modal.cats',lang);
    replaceTextContains('#modalCats .set-field .set-label','Hotel','cats.hotel',lang);
    replaceTextContains('#modalCats .set-field .set-label','Suche','cats.search',lang);
    setPlaceholder('#catsSearch','cats.search.ph',lang);
    setText('.cats-wrap .box h4.mono','cats.new',lang);
    setLabelByInputId('catCodeNew','lab.cat.code',lang);
    setLabelByInputId('catMaxNew','lab.cat.max',lang);
    setLabelByInputId('catNameNew','lab.cat.name',lang);
    setText('#btnCatCreate','cats.btn.add',lang);
    replaceTextContains('#catsTitleHotel','Kategorien','cats.title.table',lang);
    replaceTextContains('#catsPageInfo','Seite','pager.page',lang);
    replaceTextContains('#catsCount','Einträge','cats.count',lang);
    setTableHeads('#catsTable thead th', ['cats.th.code','cats.th.name','cats.th.max','cats.th.actions'], lang);
    setText('#catsPrev','pager.prev',lang); setText('#catsNext','pager.next',lang);
    replaceTextContains('#modalCats .muted.tiny','Max. 50','cats.hint',lang);

    // CHANNEL
    setText('#modalChannel header h3','modal.channel',lang);
    replaceTextContains('.channel-wrap .mono.muted.tiny','Bereiche','ch.areas',lang);
    setText('.channel-tab[data-channel-tab="api"]','tab.api',lang);
    setText('.channel-tab[data-channel-tab="property"]','tab.prop',lang);
    setText('.channel-tab[data-channel-tab="monitor"]','tab.monitor',lang);
    setText('.channel-tab[data-channel-tab="system"]','tab.system',lang);
    setText('.channel-tab[data-channel-tab="admin"]','tab.admin',lang);
    replaceTextContains('#chPage_api .card-head h3','API','ch.api.title',lang);
    setLabelByInputId('chApiKey','ch.api.key',lang);
    setLabelByInputId('chApiSecret','ch.api.secret',lang);
    setLabelByInputId('chHnsProd','ch.api.prod',lang);
    setLabelByInputId('chHnsTest','ch.api.test',lang);
    setLabelByInputId('chTimeout','ch.api.timeout',lang);
    setLabelByInputId('chRetry','ch.api.retry',lang);
    setLabelByInputId('chHotelMap','ch.api.map',lang);
    replaceTextContains('#chPage_property .card-head h3','Property','tab.prop',lang);
    replaceTextContains('#chPage_property .mono.muted.tiny','Hotels aktiv','ch.prop.hotels',lang);
    setLabelByInputId('chCatMap','ch.prop.catmap',lang);
    setLabelByInputId('chRateMap','ch.prop.ratemap',lang);
    replaceTextContains('#chPage_monitor .card-head h3','Monitoring','ch.mon.title',lang);
    replaceTextContains('#chPage_monitor .row .mono.muted.tiny','Status','ch.mon.status',lang);
    replaceTextContains('#chPage_monitor h4.mono.section','Error-Log','ch.mon.errors',lang);
    replaceTextContains('#chPage_monitor h4.mono.section + #chMappingSummary','', 'ch.mon.map', lang); // Überschrift vorher
    replaceTextContains('#chPage_system .card-head h3','System','ch.sys.title',lang);
    setLabelByInputId('chMode','ch.sys.mode',lang);
    setText('#chExport','ch.sys.export',lang);
    replaceTextContains('label[for="chImportFile"]','Import JSON','ch.sys.import',lang);
    replaceTextContains('#chPage_system .mono.muted.tiny','Hotel hinzufügen','ch.sys.add.title',lang);
    setLabelByInputId('chNewHotelCode','ch.sys.code',lang);
    setLabelByInputId('chNewHotelName','ch.sys.name',lang);
    setLabelByInputId('chNewHotelGroup','ch.sys.group',lang);
    setLabelByInputId('chNewHotelImg','ch.sys.img',lang);
    setText('#chAddHotel','ch.sys.btn.add',lang);
    setLabelByInputId('chCancelPolicy','ch.sys.cancelpol',lang);
    setText('#btnSyncNow','btn.sync',lang);
    setText('#btnSaveChannel','btn.save.channel',lang);
    replaceTextContains('#chPage_admin .card-head h3','Admin','admin.title',lang);
    replaceTextContains('#chPage_admin .settings-row label','Passwortschutz','admin.protect',lang);
    replaceTextContains('#chPage_admin .settings-row span.muted.tiny','ist aktiv','admin.protect.on',lang);
    replaceTextContains('#chPage_admin .settings-row label','Letzter Sync','admin.lastsync',lang);

    // LOG
    setText('#modalLog header h3','modal.log',lang);
    setPlaceholder('#logSearch','log.ph.search',lang);
    const optAll = document.querySelector('#logType option[value=""]'); if (optAll) optAll.textContent = tr('log.type.all',lang);
    setLabelByInputId('logFrom','lab.from',lang);
    setLabelByInputId('logTo','lab.to',lang);
    setText('#logApply','btn.apply',lang); setText('#logClear','btn.reset',lang);
    setTableHeads('#logTable thead th', ['log.th.time','log.th.user','log.th.type','log.th.action','log.th.details'], lang);
    setText('#logPrev','pager.prev',lang); setText('#logNext','pager.next',lang);
    const lpi = document.getElementById('logPageInfo'); if (lpi) lpi.textContent = lpi.textContent
      .replace(/Seite|Page/, tr('pager.page',lang))
      .replace(/Einträge|entries/, tr('pager.entries',lang));

    // HELP & FAQ
    setText('#modalHelp header h3','modal.help',lang);
    setText('#modalHelp .box h4.mono','help.quick',lang);
    replaceTextContains('#modalHelp details:nth-of-type(1) summary','Wie lege ich','help.q1',lang);
    replaceTextContains('#modalHelp details:nth-of-type(1) p.tiny','Oben','help.a1',lang);
    replaceTextContains('#modalHelp details:nth-of-type(2) summary','Woher kommen','help.q2',lang);
    replaceTextContains('#modalHelp details:nth-of-type(2) p.tiny','Aus der Tabelle','help.a2',lang);
    replaceTextContains('#modalHelp details:nth-of-type(3) summary','Werden Systeminfos','help.q3',lang);
    replaceTextContains('#modalHelp details:nth-of-type(3) p.tiny','Nein. IP','help.a3',lang);

    // SKETCH
    setText('#modalSketch header h3','modal.sketch',lang);
    replaceTextContains('#modalSketch .mono.muted.tiny','Hotels','sketch.hotels',lang);
    setText('#sketchHotelLabel','sketch.choose',lang);
    replaceTextContains('#modalSketch .pill','Skizze','sketch.pill',lang);

    // CONFIRMATION POPUP
    replaceTextContains('#confirmEmailModal h3','Reservierungsbestätigung','confirm.title',lang);
    replaceTextContains('#confirmEmailModal .form__label','Empfänger','confirm.to',lang);
    replaceTextContains('#confirmEmailModal .form__label','Nachricht','confirm.body',lang);
    setText('#btnCopyEmail','confirm.copy.mail',lang);
    setText('#btnCopyConfirmation','confirm.copy.text',lang);
    document.querySelector('#confirmEmailModal .modal__footer .btn.btn--ghost[data-close]')?.textContent = tr('confirm.abort',lang);
    setText('#btnSendConfirmationNow','confirm.send',lang);

    // language select reflect
    const sel = document.getElementById('selLang'); if (sel) sel.value = lang;
  }

  /* ---------- Dynamik beobachten (Modale öffnen etc.) ---------- */
  let mo;
  function observe(){
    if (mo) return;
    mo = new MutationObserver(()=> applyI18n(getLang()));
    mo.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['aria-hidden','class']});
  }

  /* ---------- Init ---------- */
  function init(){
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
    observe();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // optional export
  window.resToolI18n = {apply: (lng)=>applyI18n(lng), getLang, setLang};
})();

