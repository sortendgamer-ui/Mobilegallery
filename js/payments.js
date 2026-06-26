/* ============================================================
   payments.js — Pre-order flow, Cashfree checkout (automatic
   confirmation), PayPal/UPI-QR manual confirmation, admin
   orders management, customer messages, and reviews system.
   Load order: 6th (needs data.js, render.js, admin.js)
   ============================================================ */
// ─── PRE-ORDER FLOW — STEP 1 ─────────────────────────
let preorderState = {product:null, type:'phone', pct:10, amount:0};

function openPreorder(){
  if(!paymentSystemEnabled){
    showToast('⛔ Pre-orders are temporarily paused by the store. Please try again later.');
    return;
  }
  if(!currentDetailPhone) return;
  const p = currentDetailPhone;
  preorderState.product = p;
  preorderState.type = 'phone';

  // Product summary
  const summary = document.getElementById('preorderProductSummary');
  const priceNum = parsePrice(p.price);
  summary.innerHTML = `
    ${p.photo?`<img src="${p.photo}" alt="${p.name}"/>`:`<div class="pp-emoji">${p.icon||'📱'}</div>`}
    <div>
      <div class="preorder-product-name">${p.name}</div>
      <div class="preorder-product-price">Full Price: ${p.price}</div>
    </div>`;

  // Determine which % options to show based on admin setting
  const mode = p.preorderPct || '10';
  const pctRow = document.getElementById('preorderPctRow');
  let options = [];
  if(mode === 'both') options = [10,20];
  else options = [parseInt(mode)||10];

  pctRow.innerHTML = options.map((pct,i)=>`
    <div class="preorder-pct-btn ${i===0?'active':''}" data-pct="${pct}" onclick="selectPreorderPct(${pct},this)">
      <div class="preorder-pct-label">Pay Now</div>
      <div class="preorder-pct-value">${pct}%</div>
    </div>`).join('');

  preorderState.pct = options[0];
  updatePreorderAmount(priceNum, options[0]);

  document.getElementById('preorderError').style.display='none';
  ['po-name','po-phone','po-email'].forEach(id=>document.getElementById(id).value='');
  closePhoneDetail();
  document.getElementById('preorderOverlay').classList.add('show');
}

function parsePrice(priceStr){
  // Extract numeric value from "₹25,999" style string
  const digits = (priceStr||'').replace(/[^\d]/g,'');
  return parseInt(digits) || 0;
}

function selectPreorderPct(pct, el){
  preorderState.pct = pct;
  document.querySelectorAll('.preorder-pct-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  const priceNum = parsePrice(preorderState.product.price);
  updatePreorderAmount(priceNum, pct);
}

function updatePreorderAmount(priceNum, pct){
  const amount = Math.round(priceNum * pct / 100);
  preorderState.amount = amount;
  document.getElementById('preorderAmountDisplay').textContent = '₹' + amount.toLocaleString('en-IN');
}

function closePreorder(){
  document.getElementById('preorderOverlay').classList.remove('show');
}

function proceedToPayment(){
  const name  = document.getElementById('po-name').value.trim();
  const phone = document.getElementById('po-phone').value.trim();
  const email = document.getElementById('po-email').value.trim();
  const errEl = document.getElementById('preorderError');
  errEl.style.display='none';

  if(!name || !phone){ showAuthError(errEl,'❌ Name and mobile number are required!'); return; }
  if(phone.replace(/\D/g,'').length < 10){ showAuthError(errEl,'❌ Please enter a valid 10-digit mobile number!'); return; }
  if(preorderState.amount <= 0){ showAuthError(errEl,'❌ Invalid order amount. Please try again.'); return; }

  preorderState.name = name;
  preorderState.phone = phone;
  preorderState.email = email;

  closePreorder();
  openPaymentPage();
}

// ─── PAYMENT FLOW — STEP 2 ────────────────────────────
let selectedPaymentMethod = null;

function openPaymentPage(){
  document.getElementById('paymentAmountDisplay').textContent = '₹' + preorderState.amount.toLocaleString('en-IN');
  document.getElementById('paymentForProduct').textContent = 'For: ' + preorderState.product.name + ' (' + preorderState.pct + '% advance)';

  // One unified UPI button (covers GPay/PhonePe/Paytm — Cashfree's
  // checkout shows all installed UPI apps automatically) + PayPal.
  const methods = [
    {key:'upi', icon:'📱', name:'UPI (GPay / PhonePe / Paytm)'}
  ];
  if(paymentSettings.paypal.enabled) methods.push({key:'paypal', icon:'🅿️', name:'PayPal'});

  const grid = document.getElementById('paymentMethodGrid');
  grid.innerHTML = methods.map(m=>`
    <div class="payment-method-btn" data-method="${m.key}" onclick="selectPaymentMethod('${m.key}', this)">
      <div class="pm-icon">${m.icon}</div>
      <div class="pm-name">${m.name}</div>
    </div>`).join('');

  // Reset state
  selectedPaymentMethod = null;
  document.getElementById('paymentQrBox').classList.remove('show');
  document.getElementById('paypalLinkBox').style.display = 'none';
  document.getElementById('paymentStepsBox').style.display = 'none';
  document.getElementById('paymentConfirmBtn').style.display = 'none';

  document.getElementById('paymentOverlay').classList.add('show');
}

function selectPaymentMethod(key, el){
  selectedPaymentMethod = key;
  document.querySelectorAll('.payment-method-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');

  if(key === 'paypal'){
    document.getElementById('paymentQrBox').classList.remove('show');
    document.getElementById('paymentStepsBox').style.display='none';
    const id = paymentSettings.paypal.id;
    const link = id.startsWith('http') ? id : (id.includes('@') ? null : 'https://'+id);
    const box = document.getElementById('paypalLinkBox');
    const anchor = document.getElementById('paypalLinkAnchor');
    if(link){
      anchor.href = link; box.style.display='block';
    } else {
      box.style.display='none';
    }
    document.getElementById('paymentConfirmBtn').style.display='block';
    document.getElementById('paymentConfirmBtn').textContent = "✅ I've Paid — Confirm Order";
    document.getElementById('paymentConfirmBtn').onclick = confirmPaymentDone;
  } else if(key === 'upi'){
    // GPay / PhonePe / Paytm — all go through Cashfree's secure
    // checkout, which automatically shows UPI apps + QR + cards.
    // No static QR anymore — payment status is confirmed
    // automatically by the backend webhook, not by the user.
    document.getElementById('paymentQrBox').classList.remove('show');
    document.getElementById('paypalLinkBox').style.display='none';
    document.getElementById('paymentStepsBox').style.display='none';
    document.getElementById('paymentConfirmBtn').style.display='block';
    document.getElementById('paymentConfirmBtn').textContent = "🔒 Pay Securely Now";
    document.getElementById('paymentConfirmBtn').onclick = startCashfreeCheckout;
  }
}

// ─── CASHFREE CHECKOUT — real automatic confirmation ─────
async function startCashfreeCheckout(){
  if(!paymentSystemEnabled){
    showToast('⛔ Pre-orders are temporarily paused by the store.');
    closePayment();
    return;
  }
  if(!currentUser){
    showToast('❌ Please login first to make a payment!');
    closePayment();
    openLogin();
    return;
  }
  if(!cashfreeInstance){
    showToast('❌ Payment system not loaded. Please refresh the page.');
    return;
  }

  const btn = document.getElementById('paymentConfirmBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Creating order...';

  try{
    const resp = await fetch(`${BACKEND_URL}/createPreOrder`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        uid: currentUser.uid,
        productId: preorderState.product.id,
        productName: preorderState.product.name,
        fullPrice: parsePrice(preorderState.product.price),
        advancePercent: preorderState.pct,
        customerName: preorderState.name,
        customerPhone: preorderState.phone,
        customerEmail: preorderState.email
      })
    });
    const data = await resp.json();
    if(!resp.ok){
      showToast('❌ ' + (data.error || 'Could not start payment'));
      btn.disabled = false;
      btn.textContent = '🔒 Pay Securely Now';
      return;
    }

    // Remember this order id so we can check its status when the
    // checkout closes (in case the webhook takes a few seconds).
    preorderState.activeOrderId = data.orderId;

    btn.textContent = '🔒 Pay Securely Now';
    btn.disabled = false;

    cashfreeInstance.checkout({
      paymentSessionId: data.paymentSessionId,
      redirectTarget: '_modal' // opens as an in-page popup, not a redirect
    }).then(async (result)=>{
      if(result.error){
        console.warn('[Cashfree] checkout closed/error:', result.error);
      }
      // Whether the popup closed via success, failure, or user
      // closing it — check the real status from our backend
      // (driven by the webhook), never trust the popup result alone.
      await pollOrderStatus(data.orderId);
    });
  }catch(e){
    console.error('Checkout start failed:', e);
    showToast('❌ Could not connect to payment server. Please try again.');
    btn.disabled = false;
    btn.textContent = '🔒 Pay Securely Now';
  }
}

// Polls our backend (which is updated by Cashfree's webhook) to see
// if the payment has actually been confirmed.
async function pollOrderStatus(orderId, attempt=0){
  try{
    const resp = await fetch(`${BACKEND_URL}/checkOrderStatus?orderId=${encodeURIComponent(orderId)}`);
    const data = await resp.json();

    if(data.status === 'paid'){
      closePayment();
      document.getElementById('orderRefDisplay').textContent = 'Order Reference: #' + orderId;
      document.getElementById('paymentSuccessOverlay').classList.add('show');
      renderAdminOrders();
      return;
    }
    if(data.status === 'failed'){
      closePayment();
      showToast('❌ Payment failed or was cancelled. Please try again.');
      return;
    }
    // still "pending" — webhook may take a couple seconds, retry a few times
    if(attempt < 6){
      setTimeout(()=>pollOrderStatus(orderId, attempt+1), 2000);
    } else {
      showToast('⏳ Payment is still processing. We will confirm your order shortly.');
      closePayment();
    }
  }catch(e){
    console.warn('Status check failed:', e.message);
  }
}

function backToPreorder(){
  closePayment();
  document.getElementById('preorderOverlay').classList.add('show');
}

function closePayment(){
  document.getElementById('paymentOverlay').classList.remove('show');
}

// ─── PAYPAL MANUAL CONFIRM — saves to Firebase/localStorage ──
// (PayPal stays manual since it's outside the Cashfree/UPI system.
//  Admin should verify PayPal payments arrived before marking
//  fulfilled in the admin panel.)
async function confirmPaymentDone(){
  if(!selectedPaymentMethod){ showToast('❌ Please select a payment method first!'); return; }

  const order = {
    id: Date.now(),
    productName: preorderState.product.name,
    productPrice: preorderState.product.price,
    pct: preorderState.pct,
    advanceAmount: preorderState.amount,
    customerName: preorderState.name,
    customerPhone: preorderState.phone,
    customerEmail: preorderState.email || '',
    paymentMethod: selectedPaymentMethod,
    status: 'pending', // pending until shop owner verifies money received
    time: new Date().toISOString()
  };

  // Save locally
  let orders = ld('mg_orders',[]);
  orders.unshift(order);
  _svLocal('mg_orders', orders);

  // Save to Firebase
  if(firebaseEnabled){
    try{
      await db.collection('orders').doc(String(order.id)).set(order);
    }catch(e){ console.warn('[Firebase] Order save failed:', e.message); }
  }

  closePayment();
  document.getElementById('orderRefDisplay').textContent = 'Order Reference: #' + order.id;
  document.getElementById('paymentSuccessOverlay').classList.add('show');
  renderAdminOrders();
}

function closeAllPaymentModals(){
  document.getElementById('paymentSuccessOverlay').classList.remove('show');
  document.getElementById('preorderOverlay').classList.remove('show');
  document.getElementById('paymentOverlay').classList.remove('show');
}

// ─── ADMIN: Orders Management ────────────────────────
async function renderAdminOrders(){
  let orders = ld('mg_orders',[]); // legacy/PayPal manual orders (numeric id, writable)
  let cfOrders = []; // Cashfree orders (string id, read-only from browser — backend/webhook owns them)

  if(firebaseEnabled){
    try{
      const snap = await withTimeout(db.collection('orders').orderBy('createdAt','desc').get(), FIRESTORE_TIMEOUT_MS);
      if(!snap.empty){
        snap.docs.forEach(d=>{
          const data = d.data();
          if(data.cashfreeOrderId) cfOrders.push(data);
        });
      }
    }catch(e){ console.warn('[Firebase] Could not load Cashfree orders:', e.message); }
  }

  // Normalize both formats into one shape for rendering
  const normalized = [
    ...orders.map(o=>({
      id: o.id, isManual: true, productName: o.productName, productPrice: o.productPrice,
      pct: o.pct, advanceAmount: o.advanceAmount, customerName: o.customerName,
      customerPhone: o.customerPhone, customerEmail: o.customerEmail,
      paymentMethod: o.paymentMethod, status: o.status,
      whenLabel: new Date(o.time).toLocaleString('en-IN')
    })),
    ...cfOrders.map(o=>({
      id: o.cashfreeOrderId, isManual: false, productName: o.productName,
      productPrice: '₹'+(o.fullPrice||0).toLocaleString('en-IN'),
      pct: o.advancePercent, advanceAmount: o.advanceAmount, customerName: o.customerName,
      customerPhone: o.customerPhone, customerEmail: o.customerEmail,
      paymentMethod: 'upi/card (Cashfree)', status: o.status==='paid'?'confirmed':o.status,
      whenLabel: o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toLocaleString('en-IN') : '—'
    }))
  ];

  const pending = normalized.filter(o=>o.status==='pending').length;
  document.getElementById('orderCount').textContent = normalized.length;
  const badge = document.getElementById('orderBadge');
  if(pending>0){ badge.textContent=pending; badge.style.display='inline'; }
  else badge.style.display='none';

  if(!normalized.length){
    document.getElementById('adminOrdersList').innerHTML = '<p style="color:var(--muted);font-size:.85rem;">No pre-orders yet.</p>';
    return;
  }
  document.getElementById('adminOrdersList').innerHTML = normalized.map(o=>`
    <div class="order-card ${o.status}">
      <div class="order-head">
        <div><strong>${o.productName}</strong><div class="order-id">#${o.id} • ${o.whenLabel}</div></div>
        <span class="order-status-badge ${o.status}">${o.status==='pending'?'⏳ Pending Verification':(o.status==='failed'?'❌ Failed':'✅ Confirmed — Paid Automatically')}</span>
      </div>
      <div class="order-detail-grid">
        <div><span>Customer: </span><strong>${o.customerName}</strong></div>
        <div><span>Phone: </span><strong>${o.customerPhone}</strong></div>
        <div><span>Advance Paid: </span><strong style="color:var(--accent2);">₹${(o.advanceAmount||0).toLocaleString('en-IN')} (${o.pct}%)</strong></div>
        <div><span>Method: </span><strong>${o.paymentMethod}</strong></div>
        ${o.customerEmail?`<div><span>Email: </span>${o.customerEmail}</div>`:''}
        <div><span>Full Price: </span>${o.productPrice}</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        ${(o.isManual && o.status==='pending')?`<button class="ap-btn ap-btn-primary ap-btn-sm" onclick="markOrderConfirmed(${o.id})">✅ Mark Payment Received</button>`:''}
        ${(!o.isManual)?`<span style="font-size:.72rem;color:var(--muted);">🔒 Auto-verified by Cashfree — no manual action needed</span>`:''}
        <button class="ap-btn ap-btn-edit ap-btn-sm" onclick="window.open('tel:${o.customerPhone}')">📞 Call Customer</button>
        ${o.isManual?`<button class="ap-btn ap-btn-danger ap-btn-sm" onclick="deleteOrder(${o.id})">🗑️</button>`:''}
      </div>
    </div>`).join('');
}

function markOrderConfirmed(id){
  let orders = ld('mg_orders',[]);
  const idx = orders.findIndex(o=>o.id==id);
  if(idx>-1){ orders[idx].status='confirmed'; _svLocal('mg_orders',orders); }
  if(firebaseEnabled) db.collection('orders').doc(String(id)).update({status:'confirmed'}).catch(e=>{});
  renderAdminOrders();
  showToast('✅ Order marked as confirmed!');
}

function deleteOrder(id){
  if(!confirm('Delete this order record?'))return;
  let orders = ld('mg_orders',[]);
  orders = orders.filter(o=>o.id!=id);
  _svLocal('mg_orders',orders);
  if(firebaseEnabled) db.collection('orders').doc(String(id)).delete().catch(e=>{});
  renderAdminOrders();
  showToast('🗑️ Order deleted!');
}

function clearAllOrders(){
  if(!confirm('Delete ALL order records? This cannot be undone.'))return;
  _svLocal('mg_orders',[]);
  if(firebaseEnabled){
    db.collection('orders').get().then(snap=>{
      const batch=db.batch(); snap.docs.forEach(d=>batch.delete(d.ref)); batch.commit();
    }).catch(e=>{});
  }
  renderAdminOrders();
  showToast('🗑️ All orders cleared!');
}

// ─── Show/hide Pre-Order button based on phone setting ──
function openPhoneDetail(id){
  openPhoneDetailBase(id);
  const btn = document.getElementById('pdPreorderBtn');
  if(currentDetailPhone && currentDetailPhone.preorderEnabled === 'yes'){
    btn.style.display = 'flex';
  } else {
    btn.style.display = 'none';
  }
  refreshPreorderButtonState();
}

// ESC key closes payment modals too
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    closePreorder(); closePayment();
    document.getElementById('paymentSuccessOverlay').classList.remove('show');
  }
});

// ─── REALME LOGO FIX ────────────────────────────────
(function fixRealmeLogo(){
  const idx=brands.findIndex(b=>b.name==='Realme');
  if(idx>-1&&brands[idx].icon&&brands[idx].icon.includes('realme.svg')){
    brands[idx].icon=brandSvgText('realme');
  }
})();

// ─── MESSAGES ADMIN ──────────────────────────────────
async function renderAdminMessages(){
  let msgs=ld('mg_messages',[]);
  if(firebaseEnabled){
    try{const snap=await withTimeout(db.collection('messages').orderBy('id','desc').get(), FIRESTORE_TIMEOUT_MS);if(!snap.empty)msgs=snap.docs.map(d=>d.data());}catch(e){}
  }
  const unread=msgs.filter(m=>!m.read).length;
  document.getElementById('msgCount').textContent=msgs.length;
  const badge=document.getElementById('msgBadge');
  if(unread>0){badge.textContent=unread;badge.style.display='inline';}else badge.style.display='none';
  if(!msgs.length){document.getElementById('adminMsgList').innerHTML='<p style="color:var(--muted);font-size:.85rem;padding:10px;">No messages yet.</p>';return;}
  document.getElementById('adminMsgList').innerHTML=msgs.map(m=>`
    <div class="msg-card ${m.read?'':'msg-unread'}" id="msgcard-${m.id}">
      <div class="msg-card-head">
        <div><div class="msg-name">${m.name} ${!m.read?'<span class="msg-badge-new">NEW</span>':''}</div>
        <div class="msg-time">${new Date(m.time).toLocaleString('en-IN')}</div></div>
        <div style="display:flex;gap:6px;">
          <button class="ap-btn ap-btn-edit ap-btn-sm" onclick="markMsgRead(${m.id})">✓ Read</button>
          <button class="ap-btn ap-btn-danger ap-btn-sm" onclick="deleteMsg(${m.id})">🗑️</button>
        </div>
      </div>
      <div class="msg-meta">
        <span>📞 ${m.phone}</span>${m.email?`<span>📧 ${m.email}</span>`:''}
        ${m.brand?`<span>📱 ${m.brand}</span>`:''}${m.budget?`<span>💰 ${m.budget}</span>`:''}
      </div>
      ${m.message?`<div class="msg-body">${m.message}</div>`:''}
    </div>`).join('');
}
function markMsgRead(id){
  let msgs=ld('mg_messages',[]);const idx=msgs.findIndex(m=>m.id==id);
  if(idx>-1){msgs[idx].read=true;_svLocal('mg_messages',msgs);}
  if(firebaseEnabled)db.collection('messages').doc(String(id)).update({read:true}).catch(e=>{});
  renderAdminMessages();
}
function deleteMsg(id){
  if(!confirm('Delete this message?'))return;
  let msgs=ld('mg_messages',[]);msgs=msgs.filter(m=>m.id!=id);_svLocal('mg_messages',msgs);
  if(firebaseEnabled)db.collection('messages').doc(String(id)).delete().catch(e=>{});
  renderAdminMessages();showToast('🗑️ Message deleted!');
}
function clearAllMessages(){
  if(!confirm('Delete ALL messages? This cannot be undone.'))return;
  _svLocal('mg_messages',[]);
  if(firebaseEnabled){db.collection('messages').get().then(snap=>{const b=db.batch();snap.docs.forEach(d=>b.delete(d.ref));b.commit();}).catch(e=>{});}
  renderAdminMessages();showToast('🗑️ All messages cleared!');
}

// ─── REVIEWS SYSTEM ──────────────────────────────────
let reviews=ld('mg_reviews',[]);
let nextRid=ld('mg_nrid',1);
let selectedStar=0;

function setReviewStar(n){
  selectedStar=n;
  document.querySelectorAll('#starPicker span').forEach((s,i)=>{
    s.textContent=i<n?'⭐':'☆';s.classList.toggle('active',i<n);
  });
}
async function submitReview(){
  if(!currentUser){openLogin();return;}
  if(selectedStar===0){showToast('❌ Please select a star rating!');return;}
  const text=document.getElementById('reviewText').value.trim();
  if(!text){showToast('❌ Please write your review!');return;}
  const d=currentUserData||{};
  const rev={id:nextRid++,uid:currentUser.uid,name:d.name||d.username||currentUser.email.split('@')[0],
    username:d.username||'',stars:selectedStar,text,time:new Date().toISOString()};
  _svLocal('mg_nrid',nextRid);reviews.unshift(rev);_svLocal('mg_reviews',reviews);
  if(firebaseEnabled)db.collection('reviews').doc(String(rev.id)).set(rev).catch(e=>{});
  document.getElementById('reviewText').value='';selectedStar=0;
  document.querySelectorAll('#starPicker span').forEach(s=>{s.textContent='☆';s.classList.remove('active');});
  renderReviewsPage();showToast('⭐ Thank you for your review!');
}
async function renderReviewsPage(){
  if(firebaseEnabled){try{const snap=await withTimeout(db.collection('reviews').orderBy('id','desc').get(), FIRESTORE_TIMEOUT_MS);if(!snap.empty){reviews=snap.docs.map(d=>d.data());_svLocal('mg_reviews',reviews);}}catch(e){}}
  const total=reviews.length;
  const avg=total?reviews.reduce((s,r)=>s+r.stars,0)/total:0;
  document.getElementById('reviewsAvgNum').textContent=total?avg.toFixed(1):'—';
  document.getElementById('reviewsAvgStars').textContent=total?'⭐'.repeat(Math.round(avg))+'☆'.repeat(5-Math.round(avg)):'☆☆☆☆☆';
  document.getElementById('reviewsTotal').textContent=total?`Based on ${total} review${total>1?'s':''}`:'No reviews yet — be the first!';
  const loginNote=document.getElementById('reviewLoginNote');
  const formInner=document.getElementById('reviewFormInner');
  if(currentUser){loginNote.style.display='none';formInner.style.display='block';}
  else{loginNote.style.display='block';formInner.style.display='none';}
  const grid=document.getElementById('reviewsGrid');
  if(!total){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);"><div style="font-size:3rem;margin-bottom:12px;">⭐</div><p>No reviews yet. Be the first to review!</p></div>';return;}
  grid.innerHTML=reviews.map(r=>`
    <div class="review-card">
      <div class="review-header">
        <div class="review-avatar">${(r.name||'U')[0].toUpperCase()}</div>
        <div><div class="review-name">${r.name}</div>
        <div class="review-date">${new Date(r.time).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
      </div>
      <div class="review-stars">${'<span>⭐</span>'.repeat(r.stars)}${'<span style="opacity:.3">☆</span>'.repeat(5-r.stars)}</div>
      <div class="review-text">${r.text}</div>
    </div>`).join('');
}
async function renderAdminReviews(){
  if(firebaseEnabled){try{const snap=await withTimeout(db.collection('reviews').orderBy('id','desc').get(), FIRESTORE_TIMEOUT_MS);if(!snap.empty)reviews=snap.docs.map(d=>d.data());}catch(e){}}
  const total=reviews.length;const avg=total?reviews.reduce((s,r)=>s+r.stars,0)/total:0;
  document.getElementById('adminReviewCount').textContent=total;
  document.getElementById('adminAvgRating').textContent=total?avg.toFixed(1)+' ⭐':'—';
  if(!total){document.getElementById('adminReviewList').innerHTML='<p style="color:var(--muted);font-size:.85rem;">No reviews yet.</p>';return;}
  document.getElementById('adminReviewList').innerHTML=reviews.map(r=>`
    <div class="msg-card">
      <div class="msg-card-head">
        <div><div class="msg-name">${r.name} ${'⭐'.repeat(r.stars)}</div>
        <div class="msg-time">${new Date(r.time).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
        <button class="ap-btn ap-btn-danger ap-btn-sm" onclick="deleteReview(${r.id})">🗑️</button>
      </div>
      <div class="msg-body" style="margin-top:8px;">${r.text}</div>
    </div>`).join('');
}
function deleteReview(id){
  if(!confirm('Delete this review?'))return;
  reviews=reviews.filter(r=>r.id!=id);_svLocal('mg_reviews',reviews);
  if(firebaseEnabled)db.collection('reviews').doc(String(id)).delete().catch(e=>{});
  renderAdminReviews();renderReviewsPage();showToast('🗑️ Review deleted!');
}

// ─── GADGETS DATA & RENDER ───────────────────────────
let gadgets=ld('mg_gadgets',[
  {id:1,cat:'Smart Watch',name:'Smart Watch Pro X1',desc:'Heart rate, SpO2, sleep tracking, 7-day battery',price:'₹1,999',icon:'⌚',badge:'hot',badgeText:'HOT'},
  {id:2,cat:'Smart Watch',name:'Fitness Band Ultra',desc:'Step counter, calorie tracker, waterproof IP67',price:'₹999',icon:'⌚',badge:'',badgeText:''},
  {id:3,cat:'Earbuds',name:'TWS Earbuds Pro',desc:'Active noise cancellation, 30hr battery, Bluetooth 5.3',price:'₹1,499',icon:'🎧',badge:'new',badgeText:'NEW'},
  {id:4,cat:'Earbuds',name:'Bass Boost Buds',desc:'Deep bass, 25hr playtime, IPX5 water resistant',price:'₹799',icon:'🎧',badge:'sale',badgeText:'SALE'},
  {id:5,cat:'Earphones',name:'Wired Earphones HD',desc:'Hi-Fi sound, in-line mic, tangle-free cable',price:'₹299',icon:'🎵',badge:'',badgeText:''},
  {id:6,cat:'Earphones',name:'Sports Earphones',desc:'Sweat-proof, magnetic, secure fit for workouts',price:'₹499',icon:'🎵',badge:'',badgeText:''},
  {id:7,cat:'Headphones',name:'Over-Ear Headphones',desc:'40mm drivers, foldable design, 20hr battery',price:'₹1,299',icon:'🎵',badge:'hot',badgeText:'HOT'},
  {id:8,cat:'Headphones',name:'Gaming Headset RGB',desc:'Surround sound, noise-cancelling mic, LED lighting',price:'₹1,799',icon:'🎵',badge:'new',badgeText:'NEW'},
  {id:9,cat:'Phone Cover',name:'Silicone Case Pack',desc:'Shockproof, drop protection, all models available',price:'₹149',icon:'📱',badge:'',badgeText:''},
  {id:10,cat:'Phone Cover',name:'Leather Flip Cover',desc:'Wallet style, card slots, magnetic closure',price:'₹299',icon:'📱',badge:'',badgeText:''},
  {id:11,cat:'Tempered Glass',name:'9H Tempered Glass',desc:'Anti-scratch, full glue, all phone models available',price:'₹99',icon:'🔲',badge:'',badgeText:''},
  {id:12,cat:'Tempered Glass',name:'Privacy Screen Guard',desc:'Anti-spy, blue light filter, 9H hardness',price:'₹199',icon:'🔲',badge:'new',badgeText:'NEW'},
  {id:13,cat:'Charger',name:'65W Fast Charger',desc:'GaN technology, universal compatibility, USB-C',price:'₹899',icon:'🔌',badge:'hot',badgeText:'HOT'},
  {id:14,cat:'Charger',name:'20000mAh Power Bank',desc:'Dual USB + Type-C, fast charge, LED indicator',price:'₹1,299',icon:'🔋',badge:'',badgeText:''},
  {id:15,cat:'Cable',name:'Braided USB-C Cable',desc:'5A fast charging, 1.5m, nylon braided, durable',price:'₹199',icon:'🔌',badge:'',badgeText:''},
]);
let nextGadgetId=ld('mg_ngadgetid',16);
const gadgetCats=['All','Smart Watch','Earbuds','Earphones','Headphones','Phone Cover','Tempered Glass','Charger','Cable'];
let currentGadgetFilter='All';

function renderGadgetsPage(filter){
  if(filter!==undefined)currentGadgetFilter=filter;
  const f=currentGadgetFilter;
  const list=f==='All'?gadgets:gadgets.filter(g=>g.cat===f);
  const fb=document.getElementById('gadgetFilterBar');
  if(fb)fb.innerHTML=gadgetCats.map(c=>`<button class="filter-btn ${f===c?'active':''}" onclick="renderGadgetsPage('${c}')">${c}</button>`).join('');
  const grid=document.getElementById('gadgetsGrid');if(!grid)return;
  if(!list.length){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted);"><div style="font-size:4rem;">🛍️</div><p>No products in this category yet.</p></div>';return;}
  const bdg={new:'new',sale:'sale',hot:'hot'};
  grid.innerHTML=list.map(g=>{
    const inStock = g.stock !== 'out';
    return `
    <div class="phone-card" onclick="openGadgetDetail(${g.id})">
      <div class="phone-img" style="display:flex;align-items:center;justify-content:center;min-height:140px;${g.photo?'':'font-size:5rem;'}position:relative;overflow:hidden;">
        ${g.photo?`<img src="${g.photo}" alt="${g.name}" style="width:100%;height:100%;object-fit:cover;"/>`:`<span>${g.icon||'📦'}</span>`}
        <span class="stock-badge ${inStock?'in-stock':'out-of-stock'}">${inStock?'In Stock':'Out of Stock'}</span>
        ${g.badgeText?`<span class="phone-badge ${bdg[g.badge]||''}">${g.badgeText}</span>`:''}
      </div>
      <div class="phone-info">
        <div class="phone-brand">${g.cat}</div>
        <div class="phone-name">${g.name}</div>
        <div class="phone-specs" style="font-size:.78rem;line-height:1.5;">${g.desc}</div>
        <div class="phone-footer">
          <div class="phone-price">${g.price}</div>
          <button class="add-btn" onclick="event.stopPropagation();addToCart('${g.name.replace(/'/g,"\\'")}')">+</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ─── ENGLISH strings override ────────────────────────
function friendlyAuthError(code){
  const map={
    'auth/email-already-in-use':'❌ This email is already registered!',
    'auth/invalid-email':'❌ Invalid email format!',
    'auth/weak-password':'❌ Password too weak — min 6 characters!',
    'auth/user-not-found':'❌ Email or username not registered!',
    'auth/wrong-password':'❌ Incorrect password!',
    'auth/too-many-requests':'❌ Too many attempts. Please try again later.',
    'auth/network-request-failed':'❌ Check your internet connection!',
    'auth/invalid-credential':'❌ Invalid email or password!'
  };
  return map[code]||'❌ Error: '+code;
}

