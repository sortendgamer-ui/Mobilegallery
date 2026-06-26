/* ============================================================
   firebase.js — Firebase project config, Firestore read/write
   helpers, and the initApp() bootstrap that loads cloud data
   and kicks off rendering.
   Load order: LAST (depends on everything above)
   ============================================================ */
// ════════════════════════════════════════════════════
//  👉 Replace the firebaseConfig values below with
//     YOUR project's config from Firebase Console →
//     Project Settings → Your apps → SDK setup
// ════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyCNVbDwQ3Vw7kGHx9bsICKf5CVAm4pYwVY",
  authDomain: "mobilegallery-f1f0c.firebaseapp.com",
  databaseURL: "https://mobilegallery-f1f0c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mobilegallery-f1f0c",
  storageBucket: "mobilegallery-f1f0c.firebasestorage.app",
  messagingSenderId: "1012971244261",
  appId: "1:1012971244261:web:c2d9fc62e659454e67620c",
  measurementId: "G-3R7B0Q9HCF"
};

// ─── Firebase state ─────────────────────────────────
let db = null;
let firebaseEnabled = false;

// ─── Init ────────────────────────────────────────────
(function initFirebase(){
  try {
    if (firebaseConfig.apiKey === "DISABLED") {
      console.warn("[Firebase] Config not set – running in localStorage-only mode.");
      return;
    }
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseEnabled = true;
    console.log("[Firebase] Connected ✅");
  } catch(e) {
    console.warn("[Firebase] Init failed, using localStorage fallback:", e.message);
  }
})();

// ─── Firestore helpers ───────────────────────────────
// Wraps any promise with a timeout so a slow/stuck network
// connection can never freeze the whole page. If Firestore
// doesn't respond within FIRESTORE_TIMEOUT_MS, we fall back
// to local/default data instead of hanging forever.
const FIRESTORE_TIMEOUT_MS = 8000;
function withTimeout(promise, ms){
  return new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>reject(new Error('Firestore request timed out')), ms);
    promise.then(
      (val)=>{ clearTimeout(timer); resolve(val); },
      (err)=>{ clearTimeout(timer); reject(err); }
    );
  });
}

// col = 'phones' | 'brands' | 'store' | 'hero'
async function fbLoad(col, fallback){
  if (!firebaseEnabled) return fallback;
  try {
    if (col === 'store' || col === 'hero' || col === 'paymentmaster') {
      const snap = await withTimeout(db.collection('config').doc(col).get(), FIRESTORE_TIMEOUT_MS);
      return snap.exists ? snap.data() : fallback;
    } else {
      const snap = await withTimeout(db.collection(col).orderBy('id').get(), FIRESTORE_TIMEOUT_MS);
      if (snap.empty) return fallback;
      return snap.docs.map(d => d.data());
    }
  } catch(e) {
    console.warn(`[Firebase] Load '${col}' failed:`, e.message);
    return fallback;
  }
}

// fbSave for whole-array collections (legacy, kept for store/hero/paymentmaster
// which really are single config docs). For phones/brands/gadgets/etc, prefer
// fbSaveOne() below — it only writes the ONE item that changed, instead of
// re-uploading every single item (which risks hitting Firestore batch/size
// limits as your catalog grows, and fails the WHOLE save if any one old
// item has a problem).
async function fbSave(col, data){
  if (!firebaseEnabled) return;
  try {
    if (col === 'store' || col === 'hero' || col === 'paymentmaster') {
      await withTimeout(db.collection('config').doc(col).set(data), FIRESTORE_TIMEOUT_MS);
      showToast('☁️ Saved to cloud!');
      return;
    }
    // Write each item individually instead of one giant batch. This way,
    // if ONE old item somehow has a problem (e.g. unexpectedly large),
    // it doesn't block every other item — and most importantly, it
    // doesn't block the NEW item you just added from saving.
    let failCount = 0;
    for (const item of data) {
      try {
        await withTimeout(db.collection(col).doc(String(item.id)).set(item), FIRESTORE_TIMEOUT_MS);
      } catch(itemErr) {
        failCount++;
        console.warn(`[Firebase] Save '${col}' item ${item.id} failed:`, itemErr.message);
      }
    }
    if (failCount === 0) showToast('☁️ Saved to cloud!');
    else showToast(`⚠️ ${failCount} item(s) failed to sync — saved locally`);
  } catch(e) {
    console.warn(`[Firebase] Save '${col}' failed:`, e.message);
    showToast('⚠️ Cloud save failed – saved locally');
  }
}

// Saves just ONE item to its collection — much safer than re-writing the
// entire array on every single add/edit. Use this for phones/brands/gadgets/
// events/gallery/reviews/messages going forward.
async function fbSaveOne(col, item){
  if (!firebaseEnabled) return;
  try {
    await withTimeout(db.collection(col).doc(String(item.id)).set(item), FIRESTORE_TIMEOUT_MS);
    showToast('☁️ Saved to cloud!');
  } catch(e) {
    console.warn(`[Firebase] Save one '${col}' failed:`, e.message);
    showToast('⚠️ Cloud save failed – saved locally');
  }
}

async function fbDelete(col, id){
  if (!firebaseEnabled) return;
  try {
    await db.collection(col).doc(String(id)).delete();
  } catch(e) {
    console.warn(`[Firebase] Delete failed:`, e.message);
  }
}

// ─── sv() patched to also push to Firebase ───────────
function sv(k, v){
  _svLocal(k, v); // always save to localStorage
  if (typeof fbSave === 'undefined') return; // Firebase not ready yet
  if (k === 'mg_phones')  fbSave('phones', v);
  if (k === 'mg_brands')  fbSave('brands', v);
  if (k === 'mg_store')   fbSave('store', v);
  if (k === 'mg_hero')    fbSave('hero', v);
  if (k === 'mg_payment_master_enabled') fbSave('paymentmaster', {enabled: v});
}

// ─── Firebase sync indicator in Admin nav ────────────
function updateFbStatus(){
  const el = document.getElementById('fbStatus');
  if (!el) return;
  if (!firebaseEnabled) {
    el.textContent = '💾 Local Only';
    el.style.color = 'var(--muted)';
  } else {
    el.textContent = '☁️ Firebase Active';
    el.style.color = 'var(--green)';
  }
}

// ─── INIT: Load from Firebase first, then render ─────
async function initApp(){
  if (firebaseEnabled) {
    showToast('☁️ Loading data...');
    const [fbPhones, fbBrands, fbStore, fbHero, fbGallery, fbPayMaster] = await Promise.all([
      fbLoad('phones', phones),
      fbLoad('brands', brands),
      fbLoad('store',  storeInfo),
      fbLoad('hero',   heroData),
      fbLoad('gallery',gallery),
      fbLoad('paymentmaster', {enabled: paymentSystemEnabled}),
    ]);
    if (fbPhones  && fbPhones.length)                phones     = fbPhones;
    if (fbBrands  && fbBrands.length)                brands     = fbBrands;
    if (fbStore   && Object.keys(fbStore).length)    storeInfo  = fbStore;
    if (fbHero    && Object.keys(fbHero).length)     heroData   = fbHero;
    if (fbGallery && fbGallery.length)               gallery    = fbGallery;
    if (fbPayMaster && typeof fbPayMaster.enabled === 'boolean'){
      paymentSystemEnabled = fbPayMaster.enabled;
      _svLocal('mg_payment_master_enabled', paymentSystemEnabled);
    }
  }
  renderSite();
  updateFbStatus();
  initAuth();
  updateMasterPaySwitchUI();
  // Now that renderSite() has populated every page's content, it's safe
  // to actually switch to whatever page the URL hash pointed to (e.g. on
  // a refresh while viewing #phones). Doing this earlier (before render)
  // would show an empty page since the content didn't exist yet.
  const startPage = window.location.hash.replace('#','') || 'home';
  if (VALID_PAGES.includes(startPage) && startPage !== 'home') {
    showPage(startPage, false);
  }
}

initApp();
