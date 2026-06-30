/* ============================================================
   data.js — Admin credentials, storage helpers, default catalog
   data (phones/brands/gadgets seed data), and payment settings.
   Load order: 1st (no dependencies on other files)
   ============================================================ */
// ─── CREDENTIALS ───────────────────────────────────
const ADMIN_USER = 'mobilegalleryweb.mobile.com';
const ADMIN_PASS = 'mobilegallery#@123';

// ─── STORAGE HELPERS ───────────────────────────────
function ld(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch{return d;}}

// Strips heavy base64 photo fields out of array data before it goes into
// localStorage. localStorage has a small ~5-10MB total quota shared across
// the whole site — it was never meant to hold image data. Firestore (synced
// separately via fbSave/fbSaveOne) remains the real, full-data storage;
// localStorage here is only a lightweight offline-fallback cache of the
// text fields, so the save can never fail just because photos are large.
function _stripPhotosForLocalCache(v){
  if (!Array.isArray(v)) return v;
  return v.map(item=>{
    if (item && typeof item === 'object' && (item.photo || item.photos)) {
      const copy = {...item};
      if (copy.photo) copy.photo = '';
      if (copy.photos) copy.photos = [];
      return copy;
    }
    return item;
  });
}

function _svLocal(k,v){
  try{
    localStorage.setItem(k,JSON.stringify(v));
  }catch(e){
    // Most likely cause: quota exceeded because v contains base64 photos.
    // Retry once with photos stripped out — this keeps all the TEXT data
    // (name, price, specs, etc.) safely cached locally even when photos
    // are too big for localStorage. The full data (with photos) is still
    // safe in Firestore via fbSave/fbSaveOne, which has no such limit
    // (aside from the per-document 1MB cap, handled separately).
    try{
      localStorage.setItem(k, JSON.stringify(_stripPhotosForLocalCache(v)));
      console.warn('[Storage] localStorage quota hit — saved without photos locally. Full data with photos is still safe in the cloud.');
    }catch(e2){
      console.warn('[Storage] localStorage save failed even without photos:', e2.message);
    }
  }
}

// ─── DEFAULT DATA ──────────────────────────────────
let phones = ld('mg_phones',[
  {id:1,brand:'Apple',name:'iPhone 15 Pro Max',specs:'A17 Pro • 48MP • 256GB',price:'₹1,34,900',icon:'📱',badge:'new',badgeText:'NEW',photo:'',preorderEnabled:'yes',preorderPct:'both'},
  {id:2,brand:'Apple',name:'iPhone 15',specs:'A16 • 48MP • 128GB',price:'₹79,900',icon:'📱',badge:'',badgeText:'',photo:''},
  {id:3,brand:'Apple',name:'iPhone 14',specs:'A15 • 12MP • 128GB',price:'₹69,900',icon:'📱',badge:'sale',badgeText:'SALE',photo:''},
  {id:4,brand:'Samsung',name:'Galaxy S24 Ultra',specs:'Snapdragon 8 Gen3 • 200MP • 256GB',price:'₹1,29,999',icon:'📱',badge:'new',badgeText:'NEW',photo:'',preorderEnabled:'yes',preorderPct:'10'},
  {id:5,brand:'Samsung',name:'Galaxy A55',specs:'Exynos 1480 • 50MP • 128GB',price:'₹38,999',icon:'📱',badge:'',badgeText:'',photo:''},
  {id:6,brand:'Samsung',name:'Galaxy A35',specs:'Exynos 1380 • 50MP • 128GB',price:'₹30,999',icon:'📱',badge:'sale',badgeText:'SALE',photo:''},
  {id:7,brand:'Vivo',name:'Vivo V30 Pro',specs:'Dimensity 8200 • 50MP • 256GB',price:'₹42,999',icon:'📱',badge:'new',badgeText:'HOT',photo:''},
  {id:8,brand:'Vivo',name:'Vivo Y200',specs:'Snapdragon 4 Gen1 • 50MP • 128GB',price:'₹22,999',icon:'📱',badge:'',badgeText:'',photo:''},
  {id:9,brand:'Oppo',name:'Oppo Reno 11',specs:'Dimensity 8200 • 50MP • 256GB',price:'₹32,999',icon:'📱',badge:'new',badgeText:'NEW',photo:''},
  {id:10,brand:'Oppo',name:'Oppo A79',specs:'Dimensity 6020 • 50MP • 128GB',price:'₹18,999',icon:'📱',badge:'',badgeText:'',photo:''},
  {id:11,brand:'Xiaomi',name:'Redmi Note 13 Pro',specs:'Dimensity 7200 • 200MP • 256GB',price:'₹26,999',icon:'📱',badge:'new',badgeText:'HOT',photo:'',preorderEnabled:'yes',preorderPct:'20'},
  {id:12,brand:'Xiaomi',name:'Redmi 13C',specs:'Helio G85 • 50MP • 128GB',price:'₹10,999',icon:'📱',badge:'sale',badgeText:'SALE',photo:''},
  {id:13,brand:'Realme',name:'Realme 12 Pro+',specs:'Snapdragon 7s Gen2 • 50MP • 256GB',price:'₹27,999',icon:'📱',badge:'new',badgeText:'NEW',photo:''},
  {id:14,brand:'Realme',name:'Realme C67',specs:'Snapdragon 685 • 108MP • 128GB',price:'₹13,999',icon:'📱',badge:'',badgeText:'',photo:''},
  {id:15,brand:'Tecno',name:'Tecno Camon 30',specs:'Dimensity 7020 • 50MP • 256GB',price:'₹16,999',icon:'📱',badge:'new',badgeText:'NEW',photo:''},
  {id:16,brand:'Infinix',name:'Infinix Note 40 Pro',specs:'Helio G99 • 108MP • 256GB',price:'₹19,999',icon:'📱',badge:'new',badgeText:'HOT',photo:''},
]);

// ─── BRAND LOGO HELPERS ────────────────────────────
// Uses jsDelivr (simple-icons CDN) — no CORS issues, reliable, free.
// Tecno & Infinix use inline SVG text logos since no vector logo CDN exists.
function brandImg(slug,alt){
  return `<img class="brand-logo" src="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg" alt="${alt}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="brand-logo-fallback" style="display:none;font-size:1.5rem;">📱</span>`;
}
function brandSvgText(text){
  return `<svg class="brand-logo" viewBox="0 0 120 30" xmlns="http://www.w3.org/2000/svg" style="width:80px;height:26px;fill:white;opacity:.85;"><text y="22" font-size="18" font-family="Arial,sans-serif" font-weight="700" letter-spacing="1">${text}</text></svg>`;
}

let brands = ld('mg_brands',[
{id:1, name:'Apple',    icon:brandImg('apple','Apple'),       desc:'iPhone Series • 12+ Models'},
{id:2, name:'Samsung',  icon:brandImg('samsung','Samsung'),   desc:'Galaxy Series • 30+ Models'},
{id:3, name:'Vivo',     icon:brandImg('vivo','Vivo'),         desc:'V & Y Series • 20+ Models'},
{id:4, name:'Oppo',     icon:brandImg('oppo','Oppo'),         desc:'A & Reno Series • 18+ Models'},
{id:5, name:'Xiaomi',   icon:brandImg('xiaomi','Xiaomi'),     desc:'Redmi & Note Series • 25+ Models'},
{id:6, name:'Realme',   icon:brandSvgText('realme'),          desc:'C & Number Series • 15+ Models'},
{id:7, name:'Tecno',    icon:brandSvgText('TECNO'),           desc:'Spark & Camon Series • 12+ Models'},
{id:8, name:'Infinix',  icon:brandSvgText('INFINIX'),         desc:'Hot & Note Series • 10+ Models'},
{id:9, name:'Nokia',    icon:brandImg('nokia','Nokia'),       desc:'G & C Series • 8+ Models'},
{id:10,name:'OnePlus',  icon:brandImg('oneplus','OnePlus'),   desc:'Nord Series • 6+ Models'},
{id:11,name:'Google',   icon:brandImg('google','Google'),     desc:'Pixel Series • 5+ Models'},
{id:12,name:'Motorola', icon:brandImg('motorola','Motorola'), desc:'Moto G Series • 8+ Models'},
{id:13,name:'boAt',     icon:brandSvgText('boAt'),            desc:'Earbuds, Smartwatches & Speakers'},
{id:14,name:'Noise',    icon:brandSvgText('noise'),           desc:'Smartwatches & TWS Earbuds'},
{id:15,name:'JBL',      icon:brandSvgText('JBL'),             desc:'Premium Speakers & Headphones'},
{id:16,name:'Sony',     icon:brandImg('sony','Sony'),         desc:'Headphones & Audio Gear'},
{id:17,name:'Anker',    icon:brandImg('anker','Anker'),       desc:'Chargers, Cables & Power Banks'},
{id:18,name:'pTron',    icon:brandSvgText('pTron'),           desc:'Affordable Earphones & Cables'}
]);

let storeInfo = ld('mg_store',{
  name:'Mobile Gallery',tagline:"Bihar's #1 Mobile Store",
  phone1:'98765-43210',phone2:'98765-43210',
  email:'info@mobilegallery.in',timing:'Mon–Sat: 10 AM – 9 PM',
  address:'Karjain Road, Simrahi Bazar, Bihar 852111, India',
  maps:'https://maps.app.goo.gl/VqmTRuia7hJc9kg76',
  fb:'#',fb2:'',ig:'#',ig2:'',wa:'9876543210',yt:'#',
  stat1:'500+',stat2:'15+',stat3:'10K+',
});

// ─── PAYMENT SETTINGS (UPI QR — money goes directly to shop's bank account) ───
let paymentSettings = ld('mg_payment_settings',{
  gpay:{enabled:false,upi:''},
  phonepe:{enabled:false,upi:''},
  paytm:{enabled:false,upi:''},
  paypal:{enabled:false,id:''}
});

// ─── MASTER PAYMENT SWITCH — instantly stop/allow new payments ───
let paymentSystemEnabled = ld('mg_payment_master_enabled', true);

// ════════════════════════════════════════════════════════════
//  CASHFREE CONFIG — automatic payment confirmation
//  👉 Replace BACKEND_URL with your deployed Cloud Functions
//     base URL after running `firebase deploy --only functions`.
//     It looks like:
//     https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net
//  👉 Set CASHFREE_MODE to "sandbox" while testing, "production"
//     once you've completed Cashfree KYC and gone live.
//  👉 ADMIN_API_KEY must match EXACTLY what you set with:
//     firebase functions:secrets:set ADMIN_API_KEY
//     This protects the "re-verify pending orders" admin action.
//     Treat it like a password — don't share this file publicly
//     with the real key still in it.
// ════════════════════════════════════════════════════════════
const BACKEND_URL = "https://us-central1-mobilegallery-f1f0c.cloudfunctions.net";
const CASHFREE_MODE = "sandbox"; // "sandbox" | "production"
const ADMIN_API_KEY = "REPLACE_WITH_YOUR_ADMIN_API_KEY";
let cashfreeInstance = null;
// NOTE: Cashfree SDK script now loads with `defer` (for page speed), so it
// may not be available yet at this exact point in script execution. The
// actual cashfreeInstance is created later by ensureCashfreeReady() —
// called lazily right before it's needed (when the user opens the payment
// page), instead of forcing it to load on every single page visit.
function ensureCashfreeReady(){
  if (cashfreeInstance) return cashfreeInstance;
  try{
    if (typeof Cashfree !== 'undefined') {
      cashfreeInstance = Cashfree({ mode: CASHFREE_MODE });
    }
  }catch(e){ console.warn('[Cashfree] SDK init failed:', e.message); }
  return cashfreeInstance;
}

let heroData = ld('mg_hero',{
  badge:"Bihar's #1 Mobile Store",h1:'The Biggest',h2:'Mobile Store',
  desc:'Samsung, Apple, Vivo, Oppo, Xiaomi, Realme and many more brands – all in one place. Best price guarantee every day!',
  btn1:'📱 Browse Phones',btn2:'Ask Us Anything',
});

let nextPid = ld('mg_npid',17);
let nextBid = ld('mg_nbid',13);


// ════════════════════════════════════════════════════
//  IMAGE COMPRESSION HELPER
//  Firestore has a hard 1 MB limit per document. Phone
//  photos are stored as base64 text directly inside the
//  document, so an uncompressed photo (especially 3 of
//  them) can easily exceed that and make saving fail.
//  This shrinks + compresses any uploaded image down to a
//  safe size BEFORE it's turned into base64, so uploads
//  never hit the Firestore size limit again. Free, no
//  paid plan or external service needed.
// ════════════════════════════════════════════════════
function compressImageFile(file, maxWidth, maxHeight, quality){
  maxWidth  = maxWidth  || 900;
  maxHeight = maxHeight || 900;
  quality   = quality   || 0.7;
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = function(e){
      const img = new Image();
      img.onload = function(){
        let w = img.width, h = img.height;
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Safety net: if still too big, progressively lower quality
        // until it's safely under ~350KB (leaves room for 3 photos
        // + other fields, well inside the 1MB document limit).
        let q = quality;
        while (dataUrl.length > 350000 && q > 0.25) {
          q -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', q);
        }
        resolve(dataUrl);
      };
      img.onerror = function(){ reject(new Error('Could not read image file.')); };
      img.src = e.target.result;
    };
    reader.onerror = function(){ reject(new Error('Could not read file.')); };
    reader.readAsDataURL(file);
  });
}
