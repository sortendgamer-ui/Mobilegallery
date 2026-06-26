/* ============================================================
   core.js — Navigation (page routing + browser back/forward),
   hamburger menu, contact form, toast notifications, social
   link buttons.
   Load order: 4th (needs data.js, render.js, auth.js)
   ============================================================ */
// ─── NAVIGATION ────────────────────────────────────
function showPage(name, addHistory){
  // Default: add to history (true). Pass false only for popstate handler.
  if(addHistory !== false){
    const state = {page: name};
    const url   = '#' + name;
    // If same page, replace; otherwise push
    if(window.location.hash === url){
      history.replaceState(state, '', url);
    } else {
      history.pushState(state, '', url);
    }
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const pageEl = document.getElementById('page-'+name);
  if(pageEl) pageEl.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a=>a.classList.remove('active'));
  const el=document.getElementById('nav-'+name);
  if(el) el.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  // Close mobile menu
  const l=document.getElementById('navLinks');
  if(l) l.style.display='';
}

// Browser Back/Forward button handler
window.addEventListener('popstate', function(e){
  const page = (e.state && e.state.page) ? e.state.page : 'home';
  showPage(page, false);
});

// On first load — read hash from URL so direct links work
(function initPageFromHash(){
  const hash = window.location.hash.replace('#','');
  const validPages = ['home','phones','gadgets','brands','events','about','gallery','contact','reviews'];
  const startPage  = validPages.includes(hash) ? hash : 'home';
  // Set initial state so back from first page doesn't leave the site
  history.replaceState({page: startPage}, '', '#' + startPage);
  if(startPage !== 'home') showPage(startPage, false);
})();
function addToCart(name){showToast('🛒 '+name+' – inquiry registered!');}
function sendMessage(){
  const n=document.getElementById('formName').value.trim();
  const p=document.getElementById('formPhone').value.trim();
  const e=document.getElementById('formEmail').value.trim();
  const b=(document.getElementById('formBrand')||{value:''}).value;
  const bu=(document.getElementById('formBudget')||{value:''}).value;
  const m=document.getElementById('formMsg').value.trim();
  if(!n||!p){showToast('❌ Please enter your name and phone number.');return;}
  const msg={id:Date.now(),name:n,phone:p,email:e,brand:b,budget:bu,message:m,
    time:new Date().toISOString(),read:false};
  // Save to localStorage
  let msgs=ld('mg_messages',[]);msgs.unshift(msg);_svLocal('mg_messages',msgs);
  // Save to Firebase
  if(firebaseEnabled){
    db.collection('messages').doc(String(msg.id)).set(msg)
      .then(()=>console.log('[Firebase] Message saved'))
      .catch(e=>console.warn('[Firebase] Message save failed:',e.message));
  }
  showToast('✅ Message sent! We will contact you soon.');
  ['formName','formPhone','formEmail','formMsg'].forEach(id=>document.getElementById(id).value='');
  if(document.getElementById('formBrand'))document.getElementById('formBrand').value='';
  if(document.getElementById('formBudget'))document.getElementById('formBudget').value='';
}
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3200);
}
function openSocial(type){
  const m={fb:storeInfo.fb,fb2:storeInfo.fb2,ig:storeInfo.ig,ig2:storeInfo.ig2,wa:'https://wa.me/'+storeInfo.wa,yt:storeInfo.yt};
  if(m[type]&&m[type]!=='#') window.open(m[type],'_blank');
}
function toggleMenu(){
  const l=document.getElementById('navLinks');
  if(l.style.display==='flex'){l.style.display='';}
  else{l.style.display='flex';l.style.flexDirection='column';l.style.position='absolute';
    l.style.top='70px';l.style.left='0';l.style.width='100%';
    l.style.background='#0a0a0f';l.style.padding='20px';l.style.borderBottom='1px solid #2a2a3f';}
}

