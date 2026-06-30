/* ============================================================
   admin.js — Admin panel: login gate, dashboard, phones/brands/
   gadgets/events/gallery CRUD, store info & hero section editor.
   Load order: 5th (needs data.js, render.js)
   ============================================================ */
// ─── ADMIN LOGIN ────────────────────────────────────
function openAdminLogin(){document.getElementById('adminLoginOverlay').classList.add('show');}
function closeAdminLogin(){document.getElementById('adminLoginOverlay').classList.remove('show');document.getElementById('loginError').style.display='none';}
function doAdminLogin(){
  if(document.getElementById('adminUser').value===ADMIN_USER && document.getElementById('adminPass').value===ADMIN_PASS){
    closeAdminLogin();openAdminPanel();
  } else {document.getElementById('loginError').style.display='block';}
}
document.getElementById('adminPass').addEventListener('keydown',e=>{if(e.key==='Enter')doAdminLogin();});
document.getElementById('adminUser').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('adminPass').focus();});

// ─── ADMIN PANEL ────────────────────────────────────
function openAdminPanel(){
  document.getElementById('adminPanel').classList.add('show');
  renderAdminDashboard();renderAdminPhones();renderAdminBrands();renderAdminGallery();
  renderAdminGadgets();renderAdminEvents();
  renderAdminMessages();renderAdminReviews();
  renderAdminOrders();loadPaymentSettingsForm();
  loadStoreForm();loadHeroForm();
}
function exitAdmin(){
  document.getElementById('adminPanel').classList.remove('show');
  renderSite();showToast('✅ Changes saved and applied!');
}
function apTab(name,btn){
  document.querySelectorAll('.ap-section').forEach(s=>s.classList.remove('active'));
  document.getElementById('aps-'+name).classList.add('active');
  document.querySelectorAll('.ap-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  else document.querySelectorAll('.ap-tab').forEach(t=>{if(t.getAttribute('onclick')&&t.getAttribute('onclick').includes("'"+name+"'"))t.classList.add('active');});
}
function apTabClick(name){
  document.querySelectorAll('.ap-section').forEach(s=>s.classList.remove('active'));
  document.getElementById('aps-'+name).classList.add('active');
  document.querySelectorAll('.ap-tab').forEach(t=>{t.classList.remove('active');if(t.getAttribute('onclick')&&t.getAttribute('onclick').includes("'"+name+"'"))t.classList.add('active');});
}

// dashboard
function renderAdminDashboard(){
  document.getElementById('apStatsRow').innerHTML=`
    <div class="ap-stat"><div class="ap-stat-num">${phones.length}</div><div class="ap-stat-lbl">Total Phones</div></div>
    <div class="ap-stat"><div class="ap-stat-num">${brands.length}</div><div class="ap-stat-lbl">Brands</div></div>
    <div class="ap-stat"><div class="ap-stat-num">${phones.filter(p=>p.badge==='new').length}</div><div class="ap-stat-lbl">New Arrivals</div></div>
    <div class="ap-stat"><div class="ap-stat-num">${phones.filter(p=>p.badge==='sale').length}</div><div class="ap-stat-lbl">On Sale</div></div>`;
  document.getElementById('apRecentPhones').innerHTML=phones.slice(-5).reverse().map(p=>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:10px;">
        ${p.photo?`<img src="${p.photo}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">`:`<span style="font-size:1.4rem;">${p.icon}</span>`}
        <div><div style="font-size:.83rem;font-weight:600;">${p.name}</div><div style="font-size:.73rem;color:var(--muted);">${p.brand}</div></div>
      </div>
      <div style="font-size:.8rem;font-weight:700;color:var(--accent2);">${p.price}</div>
    </div>`).join('');
}

// photo preview — supports 3 slots
function previewPhoto(input, slotNum){
  const file=input.files[0]; if(!file) return;
  const img=document.getElementById('photoPreviewImg'+slotNum);
  compressImageFile(file).then(dataUrl=>{
    document.getElementById('pf-photoData'+slotNum).value=dataUrl;
    img.src=dataUrl;img.style.display='block';
  }).catch(err=>{
    showToast('❌ Could not process image: '+err.message);
  });
}

// phones admin
function renderAdminPhones(){
  const q=(document.getElementById('phoneSearch')||{value:''}).value.toLowerCase();
  const f=phones.filter(p=>!q||p.name.toLowerCase().includes(q)||p.brand.toLowerCase().includes(q));
  document.getElementById('phonesCount').textContent=phones.length;
  const bh=b=>b==='new'?'<span class="bdg-new">NEW</span>':b==='sale'?'<span class="bdg-sale">SALE</span>':b==='hot'?'<span class="bdg-hot">HOT</span>':'—';
  document.getElementById('adminPhonesTable').innerHTML=f.map(p=>`
    <tr>
      <td>${p.photo
        ?`<img src="${p.photo}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid var(--border);">`
        :`<span style="font-size:1.6rem;">${p.icon||'📱'}</span>`}
      </td>
      <td><strong>${p.brand}</strong></td>
      <td style="font-weight:600;max-width:160px;">${p.name}</td>
      <td style="color:var(--accent2);font-weight:700;">${p.price}</td>
      <td>${bh(p.badge)}</td>
      <td><div class="td-act">
        <button class="ap-btn ap-btn-edit ap-btn-sm" onclick="editPhone(${p.id})">✏️ Edit</button>
        <button class="ap-btn ap-btn-danger ap-btn-sm" onclick="deletePhone(${p.id})">🗑️</button>
      </div></td>
    </tr>`).join('');
}

function savePhone(){
  try{
    const brand=document.getElementById('pf-brand').value;
    const name=document.getElementById('pf-name').value.trim();
    const price=document.getElementById('pf-price').value.trim();
    const specs=document.getElementById('pf-specs').value.trim();
    const badgeVal=document.getElementById('pf-badge').value;
    const stock=document.getElementById('pf-stock').value;
    const icon=document.getElementById('pf-icon').value||'📱';
    const preorderEnabled=document.getElementById('pf-preorder').value;
    const preorderPct=document.getElementById('pf-preorder-pct').value;
    const photo1=document.getElementById('pf-photoData1').value;
    const photo2=document.getElementById('pf-photoData2').value;
    const photo3=document.getElementById('pf-photoData3').value;
    const editId=document.getElementById('pf-editId').value;
    if(!brand||!name||!price){showToast('❌ Brand, name and price are required!');return;}
    const bmap={new:'NEW',sale:'SALE',hot:'HOT'};
    // Build photos array (only non-empty), keep backward-compat 'photo' = first photo
    const newPhotos=[photo1,photo2,photo3].filter(Boolean);
    const obj={brand,name,price,specs,icon,badge:badgeVal,badgeText:bmap[badgeVal]||'',stock,preorderEnabled,preorderPct};
    if(editId){
      const idx=phones.findIndex(p=>p.id==editId);
      if(idx>-1){
        // If no new photos uploaded in a slot, keep old ones
        const oldPhotos = phones[idx].photos || (phones[idx].photo?[phones[idx].photo]:[]);
        const finalPhotos = [
          photo1 || oldPhotos[0] || '',
          photo2 || oldPhotos[1] || '',
          photo3 || oldPhotos[2] || ''
        ].filter(Boolean);
        obj.photos = finalPhotos;
        obj.photo  = finalPhotos[0] || '';
        phones[idx]={...phones[idx],...obj};
      }
    } else {
      obj.photos = newPhotos;
      obj.photo  = newPhotos[0] || '';
      obj.id=nextPid++;sv('mg_npid',nextPid);phones.push(obj);
    }
    sv('mg_phones',phones);
    clearPhoneForm();renderAdminPhones();renderAdminDashboard();
    showToast(editId?'✅ Phone updated!':'✅ New phone added!');
  }catch(e){
    console.error('[savePhone] Unexpected error:', e);
    showToast('❌ Could not save phone: '+e.message);
  }
}

function editPhone(id){
  const p=phones.find(x=>x.id==id); if(!p) return;
  document.getElementById('pf-brand').value=p.brand;
  document.getElementById('pf-name').value=p.name;
  document.getElementById('pf-price').value=p.price;
  document.getElementById('pf-specs').value=p.specs;
  document.getElementById('pf-badge').value=p.badge||'';
  document.getElementById('pf-stock').value=p.stock||'in';
  document.getElementById('pf-icon').value=p.icon||'📱';
  document.getElementById('pf-preorder').value=p.preorderEnabled||'';
  document.getElementById('pf-preorder-pct').value=p.preorderPct||'10';
  document.getElementById('pf-editId').value=p.id;
  const photosArr = p.photos || (p.photo?[p.photo]:[]);
  for(let i=1;i<=3;i++){
    const ph = photosArr[i-1] || '';
    document.getElementById('pf-photoData'+i).value = ph;
    const img=document.getElementById('photoPreviewImg'+i);
    if(ph){img.src=ph;img.style.display='block';}
    else{img.style.display='none';img.src='';}
  }
  document.getElementById('phoneFormTitle').textContent='✏️ Edit Phone: '+p.name;
  apTabClick('phones');
  document.getElementById('aps-phones').scrollIntoView({behavior:'smooth'});
}

function deletePhone(id){
  if(!confirm('Delete this phone?')) return;
  phones=phones.filter(p=>p.id!=id);sv('mg_phones',phones);fbDelete('phones',id);
  renderAdminPhones();renderAdminDashboard();showToast('🗑️ Phone deleted!');
}

function clearPhoneForm(){
  ['pf-brand','pf-name','pf-price','pf-specs','pf-badge','pf-editId'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('pf-icon').value='📱';
  document.getElementById('pf-stock').value='in';
  document.getElementById('pf-preorder').value='';
  document.getElementById('pf-preorder-pct').value='10';
  for(let i=1;i<=3;i++){
    document.getElementById('pf-photoData'+i).value='';
    document.getElementById('pf-photo'+i).value='';
    const img=document.getElementById('photoPreviewImg'+i);
    img.style.display='none';img.src='';
  }
  document.getElementById('phoneFormTitle').textContent='📱 Add New Phone';
}

// brands
function renderAdminBrands(){
  document.getElementById('brandsCount').textContent=brands.length;
  document.getElementById('adminBrandsTable').innerHTML=brands.map(b=>{
    const cnt=phones.filter(p=>p.brand===b.name).length;
    return `<tr>
      <td style="font-size:1.5rem;min-width:60px;"><span style="display:inline-flex;align-items:center;">${typeof b.icon==='string'&&b.icon.includes('<img')?b.icon.replace('class="brand-logo"','style="height:28px;width:auto;object-fit:contain;filter:brightness(0) invert(1);opacity:.8;"'):b.icon}</span></td>
      <td style="font-weight:700;">${b.name}</td>
      <td style="color:var(--muted);font-size:.8rem;">${b.desc}</td>
      <td><span style="background:rgba(108,63,255,.15);padding:3px 10px;border-radius:8px;font-size:.75rem;font-weight:700;">${cnt}</span></td>
      <td><div class="td-act">
        <button class="ap-btn ap-btn-edit ap-btn-sm" onclick="editBrand(${b.id})">✏️ Edit</button>
        <button class="ap-btn ap-btn-danger ap-btn-sm" onclick="deleteBrand(${b.id})">🗑️</button>
      </div></td>
    </tr>`;
  }).join('');
}
function saveBrand(){
  try{
    const name=document.getElementById('bf-name').value.trim();
    const icon=document.getElementById('bf-icon').value||'📱';
    const desc=document.getElementById('bf-desc').value.trim();
    const editId=document.getElementById('bf-editId').value;
    if(!name){showToast('❌ Brand name is required!');return;}
    if(editId){const idx=brands.findIndex(b=>b.id==editId);if(idx>-1)brands[idx]={...brands[idx],name,icon,desc};}
    else{brands.push({id:nextBid++,name,icon,desc});sv('mg_nbid',nextBid);}
    sv('mg_brands',brands);clearBrandForm();renderAdminBrands();showToast(editId?'✅ Brand updated!':'✅ Brand added!');
  }catch(e){
    console.error('[saveBrand] Unexpected error:', e);
    showToast('❌ Could not save brand: '+e.message);
  }
}
function editBrand(id){
  const b=brands.find(x=>x.id==id);if(!b)return;
  document.getElementById('bf-name').value=b.name;
  document.getElementById('bf-icon').value=b.icon;
  document.getElementById('bf-desc').value=b.desc;
  document.getElementById('bf-editId').value=b.id;
}
function deleteBrand(id){
  if(!confirm('Delete this brand?'))return;
  brands=brands.filter(b=>b.id!=id);sv('mg_brands',brands);fbDelete('brands',id);
  renderAdminBrands();showToast('🗑️ Brand deleted!');
}
function clearBrandForm(){['bf-name','bf-icon','bf-desc','bf-editId'].forEach(id=>document.getElementById(id).value='');}

// store info
function loadStoreForm(){
  const m={'si-name':'name','si-tagline':'tagline','si-phone1':'phone1','si-phone2':'phone2',
    'si-email':'email','si-timing':'timing','si-address':'address','si-maps':'maps',
    'si-fb':'fb','si-fb2':'fb2','si-ig':'ig','si-ig2':'ig2','si-yt':'yt',
    'si-stat1':'stat1','si-stat2':'stat2','si-stat3':'stat3'};
  Object.entries(m).forEach(([id,key])=>document.getElementById(id).value=storeInfo[key]||'');
}
function saveStoreInfo(){
  const m={'si-name':'name','si-tagline':'tagline','si-phone1':'phone1','si-phone2':'phone2',
    'si-email':'email','si-timing':'timing','si-address':'address','si-maps':'maps',
    'si-fb':'fb','si-fb2':'fb2','si-ig':'ig','si-ig2':'ig2','si-yt':'yt',
    'si-stat1':'stat1','si-stat2':'stat2','si-stat3':'stat3'};
  Object.entries(m).forEach(([id,key])=>storeInfo[key]=document.getElementById(id).value);
  sv('mg_store',storeInfo);
  refreshFollowUsButtons();
  showToast('✅ Store info saved!');
}

// Show/hide the optional 2nd Facebook/Instagram buttons based on whether a URL is set
function refreshFollowUsButtons(){
  const fb2Btn = document.getElementById('ci-fb2-btn');
  const ig2Btn = document.getElementById('ci-ig2-btn');
  if(fb2Btn) fb2Btn.style.display = (storeInfo.fb2 && storeInfo.fb2 !== '#') ? 'inline-block' : 'none';
  if(ig2Btn) ig2Btn.style.display = (storeInfo.ig2 && storeInfo.ig2 !== '#') ? 'inline-block' : 'none';
}

// hero
function loadHeroForm(){
  const m={'hi-badge':'badge','hi-h1':'h1','hi-h2':'h2','hi-desc':'desc','hi-btn1':'btn1','hi-btn2':'btn2'};
  Object.entries(m).forEach(([id,key])=>document.getElementById(id).value=heroData[key]||'');
}
function saveHero(){
  const m={'hi-badge':'badge','hi-h1':'h1','hi-h2':'h2','hi-desc':'desc','hi-btn1':'btn1','hi-btn2':'btn2'};
  Object.entries(m).forEach(([id,key])=>heroData[key]=document.getElementById(id).value);
  sv('mg_hero',heroData);showToast('✅ Hero section saved!');
}

// ════════════════════════════════════════════════════
// ─── EVENTS DATA & FUNCTIONS ─────────────────────────
let events   = ld('mg_events',[]);
let nextEvid = ld('mg_nevid',1);

function renderEventsPage(){
  const grid = document.getElementById('eventsPageGrid');
  if(!grid) return;
  if(!events.length){
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:70px 20px;color:var(--muted);"><div style="font-size:4rem;margin-bottom:16px;">🎉</div><p style="font-size:1rem;">No events yet. Check back soon!</p></div>';
    return;
  }
  grid.innerHTML = events.map(e=>`
    <div class="event-card">
      <div class="event-img">
        ${e.photo?`<img src="${e.photo}" alt="${e.title}" loading="lazy"/>`:'<div class="event-img-placeholder">🎉</div>'}
        ${e.badge?`<span class="event-badge">${e.badge}</span>`:''}
      </div>
      <div class="event-info">
        ${e.date?`<div class="event-date">📅 ${e.date}</div>`:''}
        <div class="event-title">${e.title}</div>
        <div class="event-desc">${e.desc}</div>
      </div>
    </div>`).join('');
}

function previewEventPhoto(input){
  const file=input.files[0];if(!file)return;
  const img=document.getElementById('eventPreviewImg');
  compressImageFile(file).then(dataUrl=>{
    document.getElementById('ev-photoData').value=dataUrl;
    img.src=dataUrl;img.style.display='block';
  }).catch(err=>{
    showToast('❌ Could not process image: '+err.message);
  });
}

function saveEvent(){
  try{
    const title  = document.getElementById('ev-title').value.trim();
    const desc   = document.getElementById('ev-desc').value.trim();
    const badge  = document.getElementById('ev-badge').value.trim();
    const date   = document.getElementById('ev-date').value.trim();
    const photo  = document.getElementById('ev-photoData').value;
    const editId = document.getElementById('ev-editId').value;
    if(!title||!desc){showToast('❌ Title and description are required!');return;}
    const obj={title,desc,badge,date,photo};
    if(editId){
      const idx=events.findIndex(e=>e.id==editId);
      if(idx>-1){if(!photo&&events[idx].photo)obj.photo=events[idx].photo;events[idx]={...events[idx],...obj};}
    } else {
      obj.id=nextEvid++;_svLocal('mg_nevid',nextEvid);events.push(obj);
    }
    _svLocal('mg_events',events);
    if(firebaseEnabled) fbSaveCollection('events',events);
    clearEventForm();renderAdminEvents();renderEventsPage();
    showToast(editId?'✅ Event updated!':'✅ Event added!');
  }catch(e){
    console.error('[saveEvent] Unexpected error:', e);
    showToast('❌ Could not save event: '+e.message);
  }
}

function deleteEvent(id){
  if(!confirm('Delete this event?'))return;
  events=events.filter(e=>e.id!=id);_svLocal('mg_events',events);
  if(firebaseEnabled) db.collection('events').doc(String(id)).delete().catch(e=>{});
  renderAdminEvents();renderEventsPage();showToast('🗑️ Event deleted!');
}

function editEvent(id){
  const e=events.find(x=>x.id==id);if(!e)return;
  document.getElementById('ev-title').value=e.title;
  document.getElementById('ev-desc').value=e.desc;
  document.getElementById('ev-badge').value=e.badge||'';
  document.getElementById('ev-date').value=e.date||'';
  document.getElementById('ev-editId').value=e.id;
  document.getElementById('ev-photoData').value=e.photo||'';
  const img=document.getElementById('eventPreviewImg');
  if(e.photo){img.src=e.photo;img.style.display='block';}else img.style.display='none';
  document.getElementById('eventFormTitle').textContent='✏️ Edit Event: '+e.title;
  apTabClick('events');
}

function clearEventForm(){
  ['ev-title','ev-desc','ev-badge','ev-date','ev-editId','ev-photoData'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ev-photo').value='';
  document.getElementById('eventPreviewImg').style.display='none';
  document.getElementById('eventFormTitle').textContent='🎉 Add New Event';
}

function renderAdminEvents(){
  document.getElementById('eventCount').textContent=events.length;
  const grid=document.getElementById('adminEventsGrid');
  if(!events.length){grid.innerHTML='<p style="color:var(--muted);font-size:.85rem;padding:8px;">No events yet. Add one above!</p>';return;}
  grid.innerHTML=events.map(e=>`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
      ${e.photo?`<img src="${e.photo}" style="width:100%;height:130px;object-fit:cover;" loading="lazy"/>`:'<div style="height:130px;display:flex;align-items:center;justify-content:center;font-size:3rem;">🎉</div>'}
      <div style="padding:12px;">
        ${e.badge?`<span style="background:var(--grad);color:#fff;font-size:.65rem;font-weight:700;padding:2px 8px;border-radius:8px;">${e.badge}</span><br>`:''}
        <div style="font-size:.83rem;font-weight:700;margin:6px 0 3px;line-height:1.3;">${e.title}</div>
        ${e.date?`<div style="font-size:.72rem;color:var(--accent2);margin-bottom:6px;">📅 ${e.date}</div>`:''}
        <div style="font-size:.74rem;color:var(--muted);margin-bottom:10px;line-height:1.5;">${e.desc.substring(0,80)}${e.desc.length>80?'…':''}</div>
        <div style="display:flex;gap:6px;">
          <button class="ap-btn ap-btn-edit ap-btn-sm" onclick="editEvent(${e.id})">✏️ Edit</button>
          <button class="ap-btn ap-btn-danger ap-btn-sm" onclick="deleteEvent(${e.id})">🗑️ Delete</button>
        </div>
      </div>
    </div>`).join('');
}

// ─── GADGETS ADMIN ───────────────────────────────────
function previewGadgetPhoto(input){
  const file=input.files[0]; if(!file) return;
  const img=document.getElementById('gadgetPhotoPreviewImg');
  compressImageFile(file).then(dataUrl=>{
    document.getElementById('gd-photoData').value=dataUrl;
    img.src=dataUrl; img.style.display='block';
  }).catch(err=>{
    showToast('❌ Could not process image: '+err.message);
  });
}

function saveGadget(){
  try{
    const cat    = document.getElementById('gd-cat').value;
    const name   = document.getElementById('gd-name').value.trim();
    const price  = document.getElementById('gd-price').value.trim();
    const icon   = document.getElementById('gd-icon').value||'📦';
    const photo  = document.getElementById('gd-photoData').value;
    const desc   = document.getElementById('gd-desc').value.trim();
    const badge  = document.getElementById('gd-badge').value;
    const stock  = document.getElementById('gd-stock').value;
    const editId = document.getElementById('gd-editId').value;
    if(!cat||!name||!price||!desc){showToast('❌ Category, name, price and description are required!');return;}
    const bmap={new:'NEW',sale:'SALE',hot:'HOT'};
    const obj={cat,name,price,icon,desc,badge,badgeText:bmap[badge]||'',stock};
    if(editId){
      const idx=gadgets.findIndex(g=>g.id==editId);
      if(idx>-1){
        // Keep old photo if no new one uploaded in this edit
        if(!photo && gadgets[idx].photo) obj.photo=gadgets[idx].photo;
        else obj.photo=photo;
        gadgets[idx]={...gadgets[idx],...obj};
      }
    } else {
      obj.photo=photo;
      obj.id=nextGadgetId++;_svLocal('mg_ngadgetid',nextGadgetId);gadgets.push(obj);
    }
    _svLocal('mg_gadgets',gadgets);
    if(firebaseEnabled) fbSaveCollection('gadgets',gadgets);
    clearGadgetForm();renderAdminGadgets();renderGadgetsPage();
    showToast(editId?'✅ Product updated!':'✅ Product added!');
  }catch(e){
    console.error('[saveGadget] Unexpected error:', e);
    showToast('❌ Could not save product: '+e.message);
  }
}

function deleteGadget(id){
  if(!confirm('Delete this product?'))return;
  gadgets=gadgets.filter(g=>g.id!=id);_svLocal('mg_gadgets',gadgets);
  if(firebaseEnabled) db.collection('gadgets').doc(String(id)).delete().catch(e=>{});
  renderAdminGadgets();renderGadgetsPage();showToast('🗑️ Product deleted!');
}

function editGadget(id){
  const g=gadgets.find(x=>x.id==id);if(!g)return;
  document.getElementById('gd-cat').value=g.cat;
  document.getElementById('gd-name').value=g.name;
  document.getElementById('gd-price').value=g.price;
  document.getElementById('gd-icon').value=g.icon||'📦';
  document.getElementById('gd-desc').value=g.desc;
  document.getElementById('gd-badge').value=g.badge||'';
  document.getElementById('gd-stock').value=g.stock||'in';
  document.getElementById('gd-editId').value=g.id;
  document.getElementById('gd-photoData').value=g.photo||'';
  const img=document.getElementById('gadgetPhotoPreviewImg');
  if(g.photo){img.src=g.photo;img.style.display='block';}
  else{img.style.display='none';img.src='';}
  document.getElementById('gadgetFormTitle').textContent='✏️ Edit: '+g.name;
  apTabClick('gadgets');
}

function clearGadgetForm(){
  ['gd-cat','gd-name','gd-price','gd-icon','gd-desc','gd-badge','gd-editId','gd-photoData'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('gd-stock').value='in';
  const photoInput=document.getElementById('gd-photo'); if(photoInput) photoInput.value='';
  const img=document.getElementById('gadgetPhotoPreviewImg'); if(img){img.style.display='none';img.src='';}
  document.getElementById('gadgetFormTitle').textContent='🛍️ Add New Product';
}

function renderAdminGadgets(){
  document.getElementById('gadgetCount').textContent=gadgets.length;
  const bh=b=>b==='new'?'<span class="bdg-new">NEW</span>':b==='sale'?'<span class="bdg-sale">SALE</span>':b==='hot'?'<span class="bdg-hot">HOT</span>':'—';
  document.getElementById('adminGadgetsTable').innerHTML=gadgets.map(g=>`
    <tr>
      <td>${g.photo?`<img src="${g.photo}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:6px;"/>`:`<span style="font-size:1.3rem;">${g.icon||'📦'}</span>`} <strong>${g.cat}</strong></td>
      <td style="font-weight:600;">${g.name}</td>
      <td style="color:var(--accent2);font-weight:700;">${g.price}</td>
      <td>${bh(g.badge)}</td>

      <td><div class="td-act">
        <button class="ap-btn ap-btn-edit ap-btn-sm" onclick="editGadget(${g.id})">✏️ Edit</button>
        <button class="ap-btn ap-btn-danger ap-btn-sm" onclick="deleteGadget(${g.id})">🗑️</button>
      </div></td>
    </tr>`).join('');
}

// Helper: batch save any collection to Firebase
async function fbSaveCollection(col, data){
  if(!firebaseEnabled)return;
  try{
    const batch=db.batch();
    data.forEach(item=>batch.set(db.collection(col).doc(String(item.id)),item));
    await batch.commit();
  }catch(e){console.warn('[Firebase] fbSaveCollection failed:',e.message);}
}

// ════════════════════════════════════════════════════
//  PAYMENT SYSTEM — UPI QR Pre-Orders
//  Money goes DIRECTLY to shop owner's bank account via
//  UPI. No backend, no secret keys, no middleman — 100% safe.
// ════════════════════════════════════════════════════

// ─── ADMIN: Payment Settings ─────────────────────────
function togglePayMethod(method){
  paymentSettings[method].enabled = !paymentSettings[method].enabled;
  document.getElementById('pm-toggle-'+method).classList.toggle('active', paymentSettings[method].enabled);
}

function loadPaymentSettingsForm(){
  updateMasterPaySwitchUI();
  ['gpay','phonepe','paytm'].forEach(m=>{
    document.getElementById('pm-toggle-'+m).classList.toggle('active', paymentSettings[m].enabled);
    document.getElementById('pm-'+m+'-upi').value = paymentSettings[m].upi || '';
  });
  document.getElementById('pm-toggle-paypal').classList.toggle('active', paymentSettings.paypal.enabled);
  document.getElementById('pm-paypal-id').value = paymentSettings.paypal.id || '';
}

// ─── MASTER PAYMENT SWITCH ────────────────────────────
function updateMasterPaySwitchUI(){
  const toggle = document.getElementById('masterPayToggle');
  const label  = document.getElementById('masterPayStatusLabel');
  if(!toggle || !label) return;
  toggle.classList.toggle('active', paymentSystemEnabled);
  label.textContent = paymentSystemEnabled ? '✅ Payments are ON — customers can pre-order' : '⛔ Payments are OFF — pre-orders are paused';
  label.style.color = paymentSystemEnabled ? 'var(--green)' : 'var(--red)';
  // Also reflect the state on the customer-facing pre-order button, if open
  refreshPreorderButtonState();
}

function toggleMasterPayment(){
  paymentSystemEnabled = !paymentSystemEnabled;
  sv('mg_payment_master_enabled', paymentSystemEnabled);
  updateMasterPaySwitchUI();

  if(paymentSystemEnabled){
    showToast('✅ Payment system turned ON — checking pending orders...');
    reverifyPendingOrdersNow();
  } else {
    showToast('⛔ Payment system turned OFF — no new pre-orders can be started');
  }
}

// Calls the backend to ask Cashfree the REAL status of every order
// still marked "pending", and updates Firestore accordingly.
// This never invents a result — only what Cashfree confirms gets written.
async function reverifyPendingOrdersNow(){
  const toggle = document.getElementById('masterPayToggle');
  if(toggle) toggle.style.opacity = '0.5';
  try{
    const resp = await fetch(`${BACKEND_URL}/reverifyPendingOrders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_API_KEY
      }
    });
    const data = await resp.json();
    if(!resp.ok){
      showToast('❌ Could not re-verify pending orders: ' + (data.error || 'Unknown error'));
      return;
    }
    if(data.checked === 0){
      showToast('✅ No pending orders to check.');
    } else {
      showToast(`✅ Checked ${data.checked} pending order(s) — ${data.paid} confirmed paid, ${data.failed} failed, ${data.stillPending} still pending.`);
    }
    renderAdminOrders();
  }catch(e){
    console.error('Re-verify failed:', e);
    showToast('❌ Could not connect to payment server to re-verify orders.');
  }finally{
    if(toggle) toggle.style.opacity = '';
  }
}

// Disables the "Pre-Order Now" button on the phone detail page
// when payments are globally off.
function refreshPreorderButtonState(){
  const btn = document.getElementById('pdPreorderBtn');
  if(!btn) return;
  if(!paymentSystemEnabled){
    btn.disabled = true;
    btn.dataset.origText = btn.dataset.origText || btn.textContent;
    btn.textContent = '⛔ Pre-Orders Temporarily Paused';
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  } else {
    btn.disabled = false;
    if(btn.dataset.origText) btn.textContent = btn.dataset.origText;
    btn.style.opacity = '';
    btn.style.cursor = '';
  }
}

function savePaymentSettings(){
  ['gpay','phonepe','paytm'].forEach(m=>{
    paymentSettings[m].upi = document.getElementById('pm-'+m+'-upi').value.trim();
  });
  paymentSettings.paypal.id = document.getElementById('pm-paypal-id').value.trim();
  // basic validation: if enabled, UPI ID should look valid
  for(const m of ['gpay','phonepe','paytm']){
    if(paymentSettings[m].enabled && !paymentSettings[m].upi.includes('@')){
      showToast('❌ '+m+': Please enter a valid UPI ID (e.g. name@bank)');
      return;
    }
  }
  if(paymentSettings.paypal.enabled && !paymentSettings.paypal.id){
    showToast('❌ PayPal: Please enter your PayPal.me link or email');
    return;
  }
  sv('mg_payment_settings', paymentSettings);
  showToast('✅ Payment settings saved!');
}

