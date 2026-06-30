/* ============================================================
   render.js — All customer-facing page rendering: home/phones/
   gadgets/brands/gallery/events grids, phone & gadget detail
   pages, image lightbox.
   Load order: 2nd (needs data.js)
   ============================================================ */
// ─── RENDER SITE ───────────────────────────────────
function renderSite(){
  // hero
  document.getElementById('heroBadgeEl').textContent = heroData.badge;
  const h1 = document.getElementById('heroH1El');
  h1.innerHTML = heroData.h1 + '<br><span id="heroH2El">' + heroData.h2 + '</span>';
  document.getElementById('heroDescEl').textContent = heroData.desc;
  document.getElementById('heroBtn1El').textContent = heroData.btn1;
  document.getElementById('heroBtn2El').textContent = heroData.btn2;
  document.getElementById('heroStat1').textContent = storeInfo.stat1;
  document.getElementById('heroStat2').textContent = storeInfo.stat2;
  document.getElementById('heroStat3').textContent = storeInfo.stat3;
  // logos/footer
  ['siteLogoName','footerStoreName','footerCopyName','aboutStoreName'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent=storeInfo.name;
  });
  document.getElementById('footerDesc').textContent = storeInfo.name+' – India\'s trusted mobile store since 2015. All brands, best prices, 100% original. '+storeInfo.address;
  // contact
  document.getElementById('ci-address').textContent = storeInfo.address;
  document.getElementById('ci-phone1').textContent = storeInfo.phone1;
  document.getElementById('ci-phone2').textContent = storeInfo.phone2;
  document.getElementById('ci-email').textContent = storeInfo.email;
  document.getElementById('ci-timing').textContent = storeInfo.timing;
  document.getElementById('ci-mapslink').href = storeInfo.maps;
  refreshFollowUsButtons();
  // brand orbit
  const ub=[...new Set(phones.map(p=>p.brand))];
  document.getElementById('brandOrbit').innerHTML=ub.slice(0,6).map(b=>`<span class="brand-pill">${b}</span>`).join('');
  // marquee
  const mi=brands.map(b=>`<span class="brand-item">${b.icon} ${b.name}</span>`).join('');
  document.getElementById('brandsMarquee').innerHTML=mi+mi;
  // phones
  document.getElementById('featuredGrid').innerHTML=phones.slice(0,8).map(phoneCard).join('');
  renderPhonesPage('all');
  renderBrandsPage();
  renderGalleryPage();
  renderGadgetsPage('All');
  renderEventsPage();
  renderReviewsPage();
  renderFilterBar();
  // footer brands
  document.getElementById('footerBrandsList').innerHTML=brands.slice(0,6).map(b=>`<li><a>${b.icon} ${b.name}</a></li>`).join('');
}

function phoneCard(p){
  const bdg={new:'new',sale:'sale',hot:'hot'};
  const hasPhoto = p.photo && p.photo.length > 0;
  const inStock = p.stock !== 'out'; // default to in-stock if not set (backward compatible)
  return `<div class="phone-card" onclick="openPhoneDetail(${p.id})">
    <div class="phone-img">
      ${hasPhoto ? `<img src="${p.photo}" alt="${p.name}"/>` : ''}
      <span class="phone-emoji">${p.icon||'📱'}</span>
      <span class="stock-badge ${inStock?'in-stock':'out-of-stock'}">${inStock?'In Stock':'Out of Stock'}</span>
      ${p.badgeText?`<span class="phone-badge ${bdg[p.badge]||''}">${p.badgeText}</span>`:''}
    </div>
    <div class="phone-info">
      <div class="phone-brand">${p.brand}</div>
      <div class="phone-name">${p.name}</div>
      <div class="phone-specs">${p.specs}</div>
      <div class="phone-footer">
        <div class="phone-price">${p.price}</div>
        <button class="add-btn" onclick="event.stopPropagation();addToCart('${p.name.replace(/'/g,"\\'")}')">+</button>
      </div>
    </div>
  </div>`;
}

function renderPhonesPage(brand){
  const f = brand==='all'?phones:phones.filter(p=>p.brand===brand);
  document.getElementById('allPhonesGrid').innerHTML = f.length
    ? f.map(phoneCard).join('')
    : '<p style="color:var(--muted);grid-column:1/-1;text-align:center;padding:40px;">No phones in this brand yet.</p>';
}

function renderFilterBar(){
  const ub=[...new Set(phones.map(p=>p.brand))];
  document.getElementById('filterBar').innerHTML=
    `<button class="filter-btn active" onclick="filterPhones('all',this)">All</button>`+
    ub.map(b=>`<button class="filter-btn" onclick="filterPhones('${b}',this)">${b}</button>`).join('');
}

function renderBrandsPage(){
  document.getElementById('brandsPageGrid').innerHTML=brands.map(b=>{
    const cnt=phones.filter(p=>p.brand===b.name).length;
    return `<div class="brand-card" onclick="showPage('phones');filterPhones('${b.name}')">
      <div class="brand-icon">${b.icon}</div>
      <div class="brand-name">${b.name}</div>
      <div class="brand-count">${b.desc} • ${cnt} phones</div>
    </div>`;
  }).join('');
}

function filterPhones(brand,btn){
  showPage('phones');
  renderPhonesPage(brand);
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
}

// ─── PHONE DETAIL PAGE ──────────────────────────────
let currentDetailPhone = null;

function openPhoneDetailBase(id){
  const p = phones.find(x=>x.id==id);
  if(!p) return;
  currentDetailPhone = p;
  const ov = document.getElementById('phoneDetailOverlay');
  const imgSec = document.getElementById('pdImgSection');
  const oldImg = imgSec.querySelector('img.pd-real-img');
  if(oldImg) oldImg.remove();

  const photosArr = (p.photos && p.photos.length) ? p.photos : (p.photo ? [p.photo] : []);

  function setMainImage(src){
    const existing = imgSec.querySelector('img.pd-real-img');
    if(existing) existing.remove();
    if(src){
      const img = document.createElement('img');
      img.src=src; img.className='pd-real-img';
      img.style.cssText='max-width:100%;max-height:300px;object-fit:contain;border-radius:10px;';
      imgSec.insertBefore(img, imgSec.firstChild);
      document.getElementById('pdEmoji').style.display='none';
    } else {
      document.getElementById('pdEmoji').style.display='block';
      document.getElementById('pdEmoji').textContent=p.icon||'📱';
    }
  }

  setMainImage(photosArr[0] || '');

  // Thumbnail row
  const thumbRow = document.getElementById('pdThumbRow');
  if(photosArr.length > 1){
    thumbRow.style.display='flex';
    thumbRow.innerHTML = photosArr.map((src,i)=>`
      <div class="pd-thumb ${i===0?'active':''}" onclick="selectPdThumb(this,'${src.replace(/'/g,"\\'")}')">
        <img src="${src}" alt="Photo ${i+1}"/>
      </div>`).join('');
  } else {
    thumbRow.style.display='none';
    thumbRow.innerHTML='';
  }

  const bdgEl=document.getElementById('pdBadgeOverlay');
  if(p.badgeText){ bdgEl.textContent=p.badgeText; bdgEl.className='pd-badge-overlay phone-badge '+(p.badge||''); bdgEl.style.display='block'; }
  else bdgEl.style.display='none';
  const stockEl=document.getElementById('pdStockBadge');
  const inStock = p.stock !== 'out';
  stockEl.textContent = inStock ? 'In Stock' : 'Out of Stock';
  stockEl.className = 'pd-stock-badge ' + (inStock?'in-stock':'out-of-stock');
  stockEl.style.display='block';
  document.getElementById('pdBrand').textContent = p.brand;
  document.getElementById('pdName').textContent  = p.name;
  document.getElementById('pdPrice').textContent = p.price;
  const specParts=(p.specs||'').split('•').map(s=>s.trim()).filter(Boolean);
  const specLabels=['Processor','Camera','Storage','Battery','Display','RAM'];
  document.getElementById('pdSpecsList').innerHTML=specParts.map((s,i)=>`
    <div class="pd-spec-row"><span class="pd-spec-label">${specLabels[i]||'Feature'}</span><span class="pd-spec-value">${s}</span></div>`).join('')
    ||'<div class="pd-spec-row"><span class="pd-spec-label">Specs</span><span class="pd-spec-value">Ask in store</span></div>';
  ov.classList.add('show'); ov.scrollTop=0; document.body.style.overflow='hidden';
}

function selectPdThumb(el, src){
  const imgSec = document.getElementById('pdImgSection');
  const existing = imgSec.querySelector('img.pd-real-img');
  if(existing) existing.remove();
  const img = document.createElement('img');
  img.src=src; img.className='pd-real-img';
  img.style.cssText='max-width:100%;max-height:300px;object-fit:contain;border-radius:10px;';
  imgSec.insertBefore(img, imgSec.firstChild);
  document.getElementById('pdEmoji').style.display='none';
  document.querySelectorAll('.pd-thumb').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
}

function closePhoneDetail(){
  document.getElementById('phoneDetailOverlay').classList.remove('show');
  document.body.style.overflow='';
}

function inquireWhatsApp(){
  if(!currentDetailPhone) return;
  const msg=encodeURIComponent(`Hi! I'm interested in "${currentDetailPhone.name}". Price: ${currentDetailPhone.price}. Is it available?`);
  window.open('https://wa.me/'+(storeInfo.wa||'9876543210')+'?text='+msg,'_blank');
}
function callStore(){
  const ph=storeInfo.phone1||storeInfo.wa||'';
  if(ph) window.location.href='tel:'+ph.replace(/\D/g,'');
  else showToast('Phone number not set — please update in Admin Panel');
}

// ─── GADGET DETAIL PAGE ──────────────────────────────
let currentDetailGadget = null;

function openGadgetDetail(id){
  const g = gadgets.find(x=>x.id==id);
  if(!g) return;
  currentDetailGadget = g;
  const ov = document.getElementById('gadgetDetailOverlay');
  const imgSec = document.getElementById('gdImgSection');
  const oldImg = imgSec.querySelector('img.pd-real-img');
  if(oldImg) oldImg.remove();

  if(g.photo){
    const img = document.createElement('img');
    img.src=g.photo; img.className='pd-real-img';
    img.style.cssText='max-width:100%;max-height:300px;object-fit:contain;border-radius:10px;';
    imgSec.insertBefore(img, imgSec.firstChild);
    document.getElementById('gdEmoji').style.display='none';
  } else {
    document.getElementById('gdEmoji').style.display='block';
    document.getElementById('gdEmoji').textContent=g.icon||'📦';
  }

  const bdgEl=document.getElementById('gdBadgeOverlay');
  if(g.badgeText){ bdgEl.textContent=g.badgeText; bdgEl.className='pd-badge-overlay phone-badge '+(g.badge||''); bdgEl.style.display='block'; }
  else bdgEl.style.display='none';
  const stockEl=document.getElementById('gdStockBadge');
  const inStockG = g.stock !== 'out';
  stockEl.textContent = inStockG ? 'In Stock' : 'Out of Stock';
  stockEl.className = 'pd-stock-badge ' + (inStockG?'in-stock':'out-of-stock');
  stockEl.style.display='block';

  document.getElementById('gdCat').textContent   = g.cat;
  document.getElementById('gdName').textContent  = g.name;
  document.getElementById('gdPrice').textContent = g.price;
  document.getElementById('gdDescBox').textContent = g.desc || 'No description available.';

  ov.classList.add('show'); ov.scrollTop=0; document.body.style.overflow='hidden';
}

function closeGadgetDetail(){
  document.getElementById('gadgetDetailOverlay').classList.remove('show');
  document.body.style.overflow='';
}

function inquireGadgetWhatsApp(){
  if(!currentDetailGadget) return;
  const msg=encodeURIComponent(`Hi! I'm interested in "${currentDetailGadget.name}". Price: ${currentDetailGadget.price}. Is it available?`);
  window.open('https://wa.me/'+(storeInfo.wa||'9876543210')+'?text='+msg,'_blank');
}

// ─── GALLERY DATA & FUNCTIONS ────────────────────────
let gallery  = ld('mg_gallery',[]);
let nextGid  = ld('mg_ngid',1);

function renderGalleryPage(){
  const grid=document.getElementById('galleryPageGrid'); if(!grid) return;
  if(!gallery.length){
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted);"><div style="font-size:4rem;margin-bottom:14px;">🖼️</div><p>No photos yet. Add photos from the Admin Panel!</p></div>';
    return;
  }
  grid.innerHTML=gallery.map(g=>`
    <div class="gallery-card" onclick="openLightbox(${g.id})">
      <div class="gallery-img">${g.photo?`<img src="${g.photo}" alt="${g.title}" loading="lazy"/>`:'<div class="gallery-img-placeholder">🏪</div>'}</div>
      <div class="gallery-info"><div class="gallery-name">${g.title}</div>${g.desc?`<div class="gallery-desc">${g.desc}</div>`:''}</div>
    </div>`).join('');
}
function openLightbox(id){
  const g=gallery.find(x=>x.id==id); if(!g||!g.photo) return;
  document.getElementById('lbImage').src=g.photo;
  document.getElementById('lbCaption').textContent=g.title;
  document.getElementById('lbSub').textContent=g.desc||"Aftab Azmi's Mobile Gallery, Simrahi Bazar";
  document.getElementById('galleryLightbox').classList.add('show');
  document.body.style.overflow='hidden';
}
function closeLightbox(){
  document.getElementById('galleryLightbox').classList.remove('show');
  document.body.style.overflow='';
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePhoneDetail();closeGadgetDetail();closeLightbox();closeRegister();closeLogin();closeProfile();}});

function previewGalleryPhoto(input){
  const file=input.files[0]; if(!file) return;
  const img=document.getElementById('galleryPreviewImg');
  compressImageFile(file).then(dataUrl=>{
    document.getElementById('gf-photoData').value=dataUrl;
    img.src=dataUrl; img.style.display='block';
  }).catch(err=>{
    showToast('❌ Could not process image: '+err.message);
  });
}
function saveGalleryPhoto(){
  try{
    const title=document.getElementById('gf-title').value.trim();
    const desc=document.getElementById('gf-desc').value.trim();
    const photo=document.getElementById('gf-photoData').value;
    const editId=document.getElementById('gf-editId').value;
    if(!title){showToast('❌ Title required!');return;}
    const obj={title,desc,photo};
    if(editId){
      const idx=gallery.findIndex(g=>g.id==editId);
      if(idx>-1){if(!photo&&gallery[idx].photo)obj.photo=gallery[idx].photo;gallery[idx]={...gallery[idx],...obj};}
    } else { obj.id=nextGid++;_svLocal('mg_ngid',nextGid);gallery.push(obj); }
    _svLocal('mg_gallery',gallery); fbSaveGallery();
    clearGalleryForm();renderAdminGallery();renderGalleryPage();
    showToast(editId?'✅ Photo updated!':'✅ Photo added!');
  }catch(e){
    console.error('[saveGalleryPhoto] Unexpected error:', e);
    showToast('❌ Could not save photo: '+e.message);
  }
}
function deleteGalleryPhoto(id){
  if(!confirm('Delete this photo?'))return;
  gallery=gallery.filter(g=>g.id!=id);_svLocal('mg_gallery',gallery);
  if(firebaseEnabled) db.collection('gallery').doc(String(id)).delete().catch(e=>console.warn(e));
  renderAdminGallery();renderGalleryPage();showToast('🗑️ Photo deleted!');
}
function editGalleryPhoto(id){
  const g=gallery.find(x=>x.id==id);if(!g)return;
  document.getElementById('gf-title').value=g.title;
  document.getElementById('gf-desc').value=g.desc||'';
  document.getElementById('gf-editId').value=g.id;
  document.getElementById('gf-photoData').value=g.photo||'';
  const img=document.getElementById('galleryPreviewImg');
  if(g.photo){img.src=g.photo;img.style.display='block';}else img.style.display='none';
  apTabClick('gallery');
}
function clearGalleryForm(){
  ['gf-title','gf-desc','gf-editId','gf-photoData'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('gf-photo').value='';
  document.getElementById('galleryPreviewImg').style.display='none';
}
function renderAdminGallery(){
  const cnt=gallery.length;
  document.getElementById('galleryCount').textContent=cnt;
  const grid=document.getElementById('adminGalleryGrid');
  if(!cnt){grid.innerHTML='<p style="color:var(--muted);font-size:.85rem;padding:10px;">No photos yet. Add some above!</p>';return;}
  grid.innerHTML=gallery.map(g=>`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;">
      ${g.photo?`<img src="${g.photo}" style="width:100%;height:130px;object-fit:cover;" loading="lazy"/>`:'<div style="height:130px;display:flex;align-items:center;justify-content:center;font-size:3rem;color:var(--muted);">🏪</div>'}
      <div style="padding:10px;">
        <div style="font-size:.83rem;font-weight:700;margin-bottom:4px;">${g.title}</div>
        ${g.desc?`<div style="font-size:.74rem;color:var(--muted);margin-bottom:8px;">${g.desc}</div>`:''}
        <div style="display:flex;gap:6px;">
          <button class="ap-btn ap-btn-edit ap-btn-sm" onclick="editGalleryPhoto(${g.id})">✏️</button>
          <button class="ap-btn ap-btn-danger ap-btn-sm" onclick="deleteGalleryPhoto(${g.id})">🗑️</button>
        </div>
      </div>
    </div>`).join('');
}
async function fbSaveGallery(){
  if(!firebaseEnabled) return;
  try{const batch=db.batch();gallery.forEach(item=>batch.set(db.collection('gallery').doc(String(item.id)),item));await batch.commit();}
  catch(e){console.warn('[Firebase] Gallery save failed:',e.message);}
}


