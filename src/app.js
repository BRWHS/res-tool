/* Design Tokens */
:root{
  --gap:16px; --radius:14px; --bg:#0b0c10; --card:#141824; --muted:#a9b0be;
  --text:#e9ecf2; --line:#222738; --brand:#51d6a9; --brand-ink:#073d2b;
  --danger:#ff5c5c; --warning:#ffd36b; --ok:#45d483;
}

*{box-sizing:border-box}
html,body{height:100%}
body{margin:0; font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;
     background:var(--bg); color:var(--text)}

.shell{max-width:1100px; margin:0 auto; padding:20px}
a{color:var(--text); text-decoration:none}
.link-ghost{opacity:.85}
.link-ghost:hover{opacity:1}

/* Header */
.app-header{display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; backdrop-filter:saturate(120%) blur(6px); background:linear-gradient(180deg,#0b0c10cc,#0b0c10aa 60%,transparent); z-index:10}
.brand{display:flex; align-items:center; gap:10px}
.logo{width:28px;height:28px;border-radius:8px;background:var(--brand);color:var(--brand-ink);display:grid;place-items:center;font-weight:800}
.topnav a{margin-left:12px; padding:8px 10px; border-radius:10px}
.topnav a:hover{background:#0f1320}

/* Progress */
.progress{position:sticky; top:64px; z-index:9; margin-bottom:10px}
.progress-track{height:6px; background:#0f1320; border-top:1px solid var(--line); border-bottom:1px solid #0f1320}
.progress-thumb{height:6px; background:var(--brand); transition:width .25s ease}
.progress-labels{display:flex; justify-content:space-between; font-size:12px; opacity:.8; margin-top:6px}
.progress-labels span.active{opacity:1; font-weight:600;}

/* Cards & layout */
.card{background:var(--card); padding:16px; border-radius:var(--radius); border:1px solid var(--line)}
.grid{display:grid; gap:var(--gap); align-items:start}
.grid.cols-3{grid-template-columns:1.5fr 1fr 1fr}
.grid.cols-2{grid-template-columns:1fr 1fr}
.grid.rate{grid-template-columns: 2fr 1fr auto}

hr{border:0; border-top:1px solid var(--line); margin:16px 0}
.muted{color:var(--muted)}
.badge{display:inline-block; padding:4px 8px; font-size:12px; border:1px solid #2b2f40; border-radius:999px; color:#c7cede}
.skeleton{background:linear-gradient(90deg,#1a1f2c 25%,#202638 37%,#1a1f2c 63%); background-size:400% 100%; animation:pulse 1.2s ease infinite}
@keyframes pulse{0%{background-position:100% 0}100%{background-position:0 0}}

.kachel{display:grid; grid-template-columns: 1fr auto; gap:10px; align-items:center}
.kachel img{width:100%; height:160px; object-fit:cover; border-radius:12px; border:1px solid var(--line)}
details > summary{list-style:none; cursor:pointer; display:inline-flex; gap:8px; align-items:center; padding:6px 10px; border-radius:999px; border:1px solid #2b2f40}
details[open] > summary{background:#111524}

/* Controls */
input, select, button, textarea{background:#0f1118; color:#fff; border:1px solid #232635; border-radius:10px; padding:10px 12px; font:inherit}
input[type="date"]{padding:8px 10px}
button.primary{background:var(--brand); color:var(--brand-ink); border:0; font-weight:700}
button.primary:disabled{opacity:.5; cursor:not-allowed}
.toolbar{display:flex; gap:12px; margin:8px 0 16px}

/* Table head in overview */
.grid.head{font-weight:600; opacity:.85; border-bottom:1px solid var(--line); padding-bottom:8px; margin-bottom:8px}

/* Toast */
.toast{position:fixed; left:50%; bottom:24px; transform:translateX(-50%); background:#101523; border:1px solid var(--line); color:var(--text); padding:10px 14px; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.35); display:none}
.toast.show{display:block}

/* Responsive */
@media (min-width: 900px){
  .grid.cols-3{grid-template-columns:2fr 1fr 1fr}
}
