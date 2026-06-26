/* ============================================================
   auth.js — Customer registration, login, profile, password
   change, logout. Uses Firebase Authentication + Firestore.
   Load order: 3rd (needs data.js, render.js)
   ============================================================ */
// === USER AUTH SYSTEM — Firebase Auth + Firestore ===
let auth = null;
let currentUser = null;
let currentUserData = null;

function initAuth(){
  if(!firebaseEnabled) return;
  auth = firebase.auth();
  auth.onAuthStateChanged(async (user)=>{
    if(user){
      currentUser = user;
      try{
        const snap = await db.collection('users').doc(user.uid).get();
        currentUserData = snap.exists ? snap.data() : null;
      }catch(e){ currentUserData=null; }
      updateAuthUI();
    } else { currentUser=null; currentUserData=null; updateAuthUI(); }
  });
}

function updateAuthUI(){
  const loggedIn=!!currentUser;
  const uname=currentUserData?.username||currentUser?.email?.split('@')[0]||'User';
  const btn=document.getElementById('userNavBtn');
  const lbl=document.getElementById('userNavLabel');
  if(btn&&lbl){
    if(loggedIn){lbl.textContent='👤 '+uname;btn.style.background='rgba(34,197,94,.12)';btn.style.borderColor='rgba(34,197,94,.3)';btn.style.color='var(--green)';}
    else{lbl.textContent='Login / Register';btn.style.background='';btn.style.borderColor='';btn.style.color='';}
  }
  const u=document.getElementById('navSettingsUser');
  const lo=document.getElementById('navSettingsLogout');
  const un=document.getElementById('navUsername');
  if(loggedIn){u&&(u.style.display='block');lo&&(lo.style.display='block');un&&(un.textContent=uname);}
  else{u&&(u.style.display='none');lo&&(lo.style.display='none');}
}

function handleUserNavClick(){if(currentUser)openProfile();else openRegister();}

function openRegister(){closeMenu();document.getElementById('registerOverlay').classList.add('show');clearAuthForms();}
function closeRegister(){document.getElementById('registerOverlay').classList.remove('show');}
function switchToLogin(){closeRegister();openLogin();}
function switchToRegister(){closeLogin();openRegister();}

async function doRegister(){
  const name=document.getElementById('reg-name').value.trim();
  const username=document.getElementById('reg-username').value.trim().toLowerCase().replace(/\s/g,'');
  const email=document.getElementById('reg-email').value.trim();
  const phone=document.getElementById('reg-phone').value.trim();
  const pass=document.getElementById('reg-pass').value;
  const pass2=document.getElementById('reg-pass2').value;
  const errEl=document.getElementById('regError');
  errEl.style.display='none';
  if(!name||!username||!email||!phone||!pass||!pass2){showAuthError(errEl,'❌ All fields are required!');return;}
  if(username.length<3){showAuthError(errEl,'❌ Username must be at least 3 characters!');return;}
  if(!/^[a-z0-9_]+$/.test(username)){showAuthError(errEl,'❌ Username can only contain letters, numbers and underscore!');return;}
  if(phone.replace(/\D/g,'').length<10){showAuthError(errEl,'❌ Phone number must be 10 digits!');return;}
  if(pass.length<6){showAuthError(errEl,'❌ Password must be at least 6 characters!');return;}
  if(pass!==pass2){showAuthError(errEl,'❌ Passwords do not match!');return;}
  if(!firebaseEnabled){showAuthError(errEl,'❌ Firebase not connected!');return;}
  setAuthLoading('reg',true);
  try{
    const usnap=await db.collection('usernames').doc(username).get();
    if(usnap.exists){showAuthError(errEl,'❌ This username is already taken!');setAuthLoading('reg',false);return;}
    const cred=await auth.createUserWithEmailAndPassword(email,pass);
    const uid=cred.user.uid;
    const userData={uid,name,username,email,phone,joinedAt:new Date().toISOString(),createdAt:firebase.firestore.FieldValue.serverTimestamp()};
    await db.collection('users').doc(uid).set(userData);
    await db.collection('usernames').doc(username).set({uid,email});
    currentUserData=userData;
    closeRegister();
    showToast('🎉 Welcome '+name+'! Account created successfully!');
  }catch(e){showAuthError(errEl,friendlyAuthError(e.code));}
  setAuthLoading('reg',false);
}

function openLogin(){closeMenu();document.getElementById('loginOverlay').classList.add('show');clearAuthForms();}
function closeLogin(){document.getElementById('loginOverlay').classList.remove('show');}

async function doLogin(){
  let identifier=document.getElementById('log-id').value.trim();
  const pass=document.getElementById('log-pass').value;
  const errEl=document.getElementById('loginError2');
  errEl.style.display='none';
  if(!identifier||!pass){showAuthError(errEl,'❌ Email/Username and password are required!');return;}
  if(!firebaseEnabled){showAuthError(errEl,'❌ Firebase not connected!');return;}
  setAuthLoading('login',true);
  try{
    let email=identifier;
    if(!identifier.includes('@')){
      const usnap=await db.collection('usernames').doc(identifier.toLowerCase()).get();
      if(!usnap.exists){showAuthError(errEl,'❌ This username is not registered!');setAuthLoading('login',false);return;}
      email=usnap.data().email;
    }
    await auth.signInWithEmailAndPassword(email,pass);
    closeLogin();
    showToast('✅ Login successful! Welcome back!');
  }catch(e){showAuthError(errEl,friendlyAuthError(e.code));}
  setAuthLoading('login',false);
}

function openProfile(){
  closeMenu();
  if(!currentUser){openLogin();return;}
  const d=currentUserData||{};
  document.getElementById('profileAvatar').textContent=(d.name||'U')[0].toUpperCase();
  document.getElementById('profileUsername').textContent=d.username||'--';
  document.getElementById('profileEmailDisplay').textContent=d.email||currentUser.email;
  document.getElementById('profileName').textContent=d.name||'--';
  document.getElementById('profileUsernameInfo').textContent=d.username||'--';
  document.getElementById('profileEmailInfo').textContent=d.email||currentUser.email;
  document.getElementById('profilePhoneInfo').textContent=d.phone||'--';
  const joined=d.joinedAt?new Date(d.joinedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'--';
  document.getElementById('profileJoined').textContent=joined;
  document.getElementById('pwdError').style.display='none';
  ['pwd-current','pwd-new','pwd-confirm'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('profileOverlay').classList.add('show');
}
function closeProfile(){document.getElementById('profileOverlay').classList.remove('show');}

async function changePassword(){
  const current=document.getElementById('pwd-current').value;
  const newPwd=document.getElementById('pwd-new').value;
  const confirm=document.getElementById('pwd-confirm').value;
  const errEl=document.getElementById('pwdError');
  errEl.style.display='none';
  if(!current||!newPwd||!confirm){showAuthError(errEl,'❌ All fields are required!');return;}
  if(newPwd.length<6){showAuthError(errEl,'❌ New password must be at least 6 characters!');return;}
  if(newPwd!==confirm){showAuthError(errEl,'❌ New passwords do not match!');return;}
  if(!currentUser)return;
  try{
    const cred=firebase.auth.EmailAuthProvider.credential(currentUser.email,current);
    await currentUser.reauthenticateWithCredential(cred);
    await currentUser.updatePassword(newPwd);
    ['pwd-current','pwd-new','pwd-confirm'].forEach(id=>document.getElementById(id).value='');
    showToast('✅ Password changed successfully!');closeProfile();
  }catch(e){showAuthError(errEl,e.code==='auth/wrong-password'?'❌ Current password is incorrect!':friendlyAuthError(e.code));}
}

async function logoutUser(){
  if(!confirm('Are you sure you want to logout?'))return;
  closeProfile();closeMenu();
  if(auth)await auth.signOut();
  showToast('👋 Logged out successfully!');
}

function showAuthError(el,msg){el.textContent=msg;el.style.display='block';}
function clearAuthForms(){
  ['reg-name','reg-username','reg-email','reg-phone','reg-pass','reg-pass2','log-id','log-pass'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['regError','loginError2'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
}
function setAuthLoading(type,on){
  if(type==='reg'){document.getElementById('regBtn').style.display=on?'none':'block';document.getElementById('regSpinner').style.display=on?'block':'none';}
  else{document.getElementById('loginBtn').style.display=on?'none':'block';document.getElementById('loginSpinner').style.display=on?'block':'none';}
}
function closeMenu(){const l=document.getElementById('navLinks');if(l)l.style.display='';}
function friendlyAuthError(code){
  const map={'auth/email-already-in-use':'❌ This email is already registered!','auth/invalid-email':'❌ Invalid email format!','auth/weak-password':'❌ Password too weak — min 6 characters!','auth/user-not-found':'❌ Email or username not found!','auth/wrong-password':'❌ Incorrect password!','auth/too-many-requests':'❌ Too many attempts. Please try again later.','auth/network-request-failed':'❌ Check your internet connection!','auth/invalid-credential':'❌ Invalid email or password!'};
  return map[code]||'❌ Error: '+code;
}

