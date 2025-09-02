/* === Res-Tool: Auth Overlay (add-on) ===
   Drop-in login with blur lock & user badge
   Default user: ID=Admin, PW=6764
*/
(function(){
  const STORAGE_KEY = 'resToolAuth';
  const ADMIN_ID = 'Admin';
  const ADMIN_PW = '6764';

  /** Utilities **/
  const qs = sel => document.querySelector(sel);
  const ce = (tag, props={}) => Object.assign(document.createElement(tag), props);

  function readAuth(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch{ return null; }
  }
  function writeAuth(obj){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj || null));
  }
  function clearAuth(){ localStorage.removeItem(STORAGE_KEY); }

  function dispatch(name, detail){
    try{ window.dispatchEvent(new CustomEvent(name, { detail })); }catch{}
  }

  // Build overlay if not present
  function ensureOverlay(){
    if(qs('#authOverlay')) return;

    const overlay = ce('div', { id: 'authOverlay' });
    const modal = ce('div', { id: 'authModal' });

    const title = ce('h3', { className: 'auth-title', textContent: 'Anmeldung' });
    const sub = ce('p', { className: 'auth-sub', textContent: 'Bitte einloggen, um das Dashboard zu verwenden.' });

    const fUser = ce('div', { className: 'auth-field' });
    const lUser = ce('label', { className: 'auth-label', textContent: 'Benutzer-ID' });
    const iUser = ce('input', { className: 'auth-input', id: 'authUser', placeholder: 'z. B. Admin', autocomplete: 'username' });
    fUser.append(lUser, iUser);

    const fPw = ce('div', { className: 'auth-field' });
    const lPw = ce('label', { className: 'auth-label', textContent: 'Passwort' });
    const iPw = ce('input', { className: 'auth-input', id: 'authPass', placeholder: '••••', type: 'password', autocomplete: 'current-password' });
    fPw.append(lPw, iPw);

    const err = ce('div', { id: 'authErr', className: 'auth-err', textContent: 'Ungültige Zugangsdaten. Versuche: Admin / 6764' });

    const actions = ce('div', { className: 'auth-actions' });
    const btnLogin = ce('button', { className: 'auth-btn', textContent: 'Login' });
    const btnCancel = ce('button', { className: 'auth-btn', textContent: 'Abbrechen' });
    actions.append(btnLogin, btnCancel);

    modal.append(title, sub, fUser, fPw, err, actions);
    overlay.append(modal);
    document.body.append(overlay);

    // Events
    btnCancel.addEventListener('click', () => {
      iUser.value = ''; iPw.value = '';
      iUser.focus();
    });

    function tryLogin(){
      const u = (iUser.value || '').trim();
      const p = iPw.value || '';
      if(u === ADMIN_ID && p === ADMIN_PW){
        err.classList.remove('active');
        signIn({ id: u });
      } else {
        err.classList.add('active');
      }
    }

    btnLogin.addEventListener('click', tryLogin);
    iPw.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') tryLogin(); });
  }

  function ensureBadge(){
    if(qs('#authUserBadge')) return;
    const badge = ce('div', { id:'authUserBadge' });
    const dot = ce('span', { id:'authUserDot' });
    const label = ce('span', { id:'authUserLabel', textContent: '' });
    badge.append(dot, label);
    document.body.append(badge);

    badge.addEventListener('click', ()=>{
      if(confirm('Abmelden?')){ signOut(); }
    });
  }

  function showOverlay(active){
    const overlay = qs('#authOverlay');
    if(!overlay) return;
    overlay.classList.toggle('active', !!active);
  }

  function setAppBlurred(blur){
    const root = qs('#app') || qs('main') || qs('#root') || qs('body > div');
    document.documentElement.classList.toggle('auth-lock', !!blur);
    document.body.classList.toggle('auth-lock', !!blur);
    if(root){
      root.classList.toggle('app-blurred', !!blur);
    } else {
      document.body.classList.toggle('app-blurred', !!blur);
    }
  }

  function updateBadge(user){
    ensureBadge();
    const badge = qs('#authUserBadge');
    const label = qs('#authUserLabel');
    if(user){
      badge.classList.add('active');
      label.textContent = user.id;
    }else{
      badge.classList.remove('active');
      label.textContent = '';
    }
  }

  function replaceAnonymousEverywhere(username){
    const targets = ['#activityLog', '.activity-log', '.log', '#logs', 'body'];
    const rx = /\banonymous\b/gi;

    function replaceInNode(node){
      if(node.nodeType === Node.TEXT_NODE){
        if(rx.test(node.nodeValue)){
          node.nodeValue = node.nodeValue.replace(rx, username);
        }
      }else{
        node.childNodes && node.childNodes.forEach(replaceInNode);
      }
    }

    targets.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => replaceInNode(el));
    });
  }

  /** Public-ish API **/
  window.getCurrentUser = function(){
    return readAuth();
  };

  // If the host app has a logger, wrap it to add user meta.
  function wrapLogger(){
    const w = window;
    ['logActivity','addActivity','pushActivity'].forEach(fn => {
      if(typeof w[fn] === 'function' && !w[fn]._wrappedByAuth){
        const orig = w[fn];
        w[fn] = function(){
          try{
            const user = readAuth();
            if(arguments.length){
              if(typeof arguments[0] === 'object' && arguments[0]){
                arguments[0].user = user?.id || 'anonymous';
              } else if (typeof arguments[0] === 'string'){
                arguments[0] = arguments[0] + ` (by ${user?.id || 'anonymous'})`;
              }
            }
          }catch{}
          return orig.apply(this, arguments);
        };
        w[fn]._wrappedByAuth = true;
      }
    });
  }

  function signIn(user){
    writeAuth(user);
    updateBadge(user);
    replaceAnonymousEverywhere(user.id);
    setAppBlurred(false);
    showOverlay(false);
    dispatch('auth:login', { user });
  }

  function signOut(){
    clearAuth();
    updateBadge(null);
    setAppBlurred(true);
    showOverlay(true);
    dispatch('auth:logout', {});
  }

  // Boot
  document.addEventListener('DOMContentLoaded', () => {
    ensureOverlay();
    ensureBadge();
    wrapLogger();

    const user = readAuth();
    if(user){
      updateBadge(user);
      setAppBlurred(false);
      showOverlay(false);
      dispatch('auth:ready', { user });
    } else {
      setAppBlurred(true);
      showOverlay(true);
      dispatch('auth:ready', { user: null });
    }

    // Expose a lightweight API for the host app
    window.ResToolAuth = {
      signIn, signOut, get user(){ return readAuth(); }
    };
  });
})();
