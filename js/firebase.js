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

async function fbSave(col, data){
  if (!firebaseEnabled) return;
  try {
    if (col === 'store' || col === 'hero' || col === 'paymentmaster') {
      await db.collection('config').doc(col).set(data);
    } else {
      // data is an array → batch write
      const batch = db.batch();
      data.forEach(item => {
        const ref = db.collection(col).doc(String(item.id));
        batch.set(ref, item);
      });
      await batch.commit();
    }
    showToast('☁️ Saved to cloud!');
  } catch(e) {
    console.warn(`[Firebase] Save '${col}' failed:`, e.message);
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
}

initApp();
