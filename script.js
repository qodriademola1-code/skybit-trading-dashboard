// ==========================================
// 1. CONFIG & GLOBAL VARIABLES
// ==========================================
const MARKET_RATES = {
    amazon: { 
        usd: { low: 800, mid: 850, high: 900 }, 
        gbp: { low: 1000, mid: 1050, high: 1100 }, 
        eur: { low: 900, mid: 950, high: 1000 },
        cad: { low: 650, mid: 700, high: 750 } 
    },
    steam: { 
        usd: { low: 700, mid: 750, high: 800 }, 
        gbp: { low: 900, mid: 950, high: 1000 }, 
        eur: { low: 850, mid: 900, high: 950 },
        cad: { low: 600, mid: 650, high: 700 } 
    },
    razer: { 
        usd: { low: 500, mid: 650, high: 800 }, 
        gbp: { low: 400, mid: 50, high: 100 }, 
        eur: { low: 860, mid: 970, high: 980 },
        cad: { low: 600, mid: 650, high: 700 } 
    }
};
let selectedFiles = [];

// ==========================================
// 2. CORE INITIALIZATION & AUTH PROTECTION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Loaded - Initializing...");

    const userEmail = localStorage.getItem('currentUser');
    const path = window.location.pathname;
    const isAuthPage = path.includes('login.html') || path.includes('signup.html') || path.includes('index.html') || path === '/' || path === '';

    // 1. Page Protection Logic
    if (!userEmail && !isAuthPage) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Initialize Auth Forms (Signup/Login)
    setupAuthListeners();

    // 3. Initialize User Data (only if logged in)
    if (userEmail) {
        try {
            const userData = localStorage.getItem(userEmail);
            if (!userData) {
                console.error("User data missing for:", userEmail);
                return;
            }
            const userObj = JSON.parse(userData);

            // Role Protection
            if (path.includes('admin.html') && userObj.role !== 'admin') {
                window.location.href = 'dashboard.html';
                return;
            }

            // Update UI Elements
            const nameDisp = document.getElementById('user-display-name');
            if (nameDisp && userObj.name) nameDisp.innerText = userObj.name.split(' ')[0];
            
            const balDisp = document.querySelectorAll('#balance-amount, #user-balance');
            balDisp.forEach(el => el.innerText = "₦" + parseFloat(userObj.balance || 0).toLocaleString());

            // Run View Renders
            if (typeof renderUserHistory === "function") renderUserHistory();
            if (typeof renderNotifications === "function") renderNotifications();
            
        } catch (err) {
            console.error("Error loading user data:", err);
        }
    }

    // 4. Admin Initializer
    if (path.includes('admin.html')) {
        loadAdminData();
    }
});

function setupFormListeners() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = signupForm.querySelector('input[placeholder*="Name"]').value;
            const email = signupForm.querySelector('input[type="email"]').value;
            const password = signupForm.querySelector('input[type="password"]').value;
            localStorage.setItem(email, JSON.stringify({ name, email, password, balance: 0, history: [], savedBanks: [], role: 'user' }));
            localStorage.setItem('currentUser', email);
            window.location.href = 'dashboard.html';
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            const user = JSON.parse(localStorage.getItem(email));
            if (user && user.password === password) {
    localStorage.setItem('currentUser', email);
    
    // --- PLACE IT HERE ---
    addNotification('Security', 'New login detected on your account.');
    
    window.location.href = 'dashboard.html';
}
 else { alert("Invalid Credentials!"); }
        });
    }
}

// ==========================================
// 3. FINANCE & WALLET SYSTEM
// ==========================================
function openWithdrawal() {
    const box = document.getElementById('withdrawal-box');
    if (box) box.style.display = 'block';
}

function toggleBankForm() {
    const form = document.getElementById('new-bank-form');
    if (form) form.style.display = (form.style.display === 'none') ? 'block' : 'none';
}

function saveNewBank() {
    const userEmail = localStorage.getItem('currentUser');
    const userObj = JSON.parse(localStorage.getItem(userEmail));
    const name = document.getElementById('new-acc-name').value;
    const acc = document.getElementById('new-acc-num').value;
    const bank = document.getElementById('new-bank-name').value;

    if (!name || !acc || bank === "Select Bank") return alert("Fill all bank details!");
    if (!userObj.savedBanks) userObj.savedBanks = [];
    
    userObj.savedBanks.push(`${name.toUpperCase()} | ${bank} | ${acc}`);
    localStorage.setItem(userEmail, JSON.stringify(userObj));
    alert("Bank Saved!");
    location.reload();
}

function submitWithdrawalRequest() {
    const userEmail = localStorage.getItem('currentUser');
    const userObj = JSON.parse(localStorage.getItem(userEmail));
    const bankInfo = document.getElementById('saved-bank-selector').value;
    const amt = parseFloat(document.getElementById('withdraw-amount').value);

    if (!bankInfo) return alert("Select a saved bank!");
    if (isNaN(amt) || amt > userObj.balance || amt <= 0) return alert("Invalid amount!");

    userObj.balance -= amt;
    userObj.history.push({ 
        type: "Withdrawal", 
        bankInfo: bankInfo, 
        amount: amt, 
        status: "Pending", 
        date: new Date().toLocaleString() 
    });

    localStorage.setItem(userEmail, JSON.stringify(userObj));
    alert("Withdrawal Requested Successfully!");
    location.reload();
}

// ==========================================
// 4. TRADING & IMAGE HANDLING
// ==========================================
function calculateCardTotal(cardType) {
    const amtEl = document.getElementById(`${cardType}-amount`);
    if (!amtEl) return;
    const amt = parseFloat(amtEl.value) || 0;
    const curr = document.getElementById(`${cardType}-currency`).value;
    const qty = parseInt(document.getElementById(`${cardType}-qty`).value) || 1;
    const rates = MARKET_RATES[cardType][curr];
    let rate = amt >= 200 ? rates.high : (amt >= 100 ? rates.mid : rates.low);
    document.getElementById(`${cardType}-current-rate`).innerText = rate;
    document.getElementById(`${cardType}-total`).innerText = (amt * qty * rate).toLocaleString();
}

function prepareUpload(assetName, totalId) {
    document.getElementById('up-asset-name').innerText = assetName;
    document.getElementById('up-asset-total').innerText = "₦" + document.getElementById(totalId).innerText;
    
    const cardBase = assetName.toLowerCase().split(' ')[0];
    const meta = {
        amount: document.getElementById(`${cardBase}-amount`).value,
        currency: document.getElementById(`${cardBase}-currency`).value,
        qty: document.getElementById(`${cardBase}-qty`).value
    };
    localStorage.setItem('temp_meta', JSON.stringify(meta));
    navigateTo('upload-view');
}

function handleFiles(files) {
    const list = document.getElementById('file-list');
    for (let f of files) { if (selectedFiles.length < 100) selectedFiles.push(f); }
    list.innerHTML = `<p style="color:#9333ea; font-weight:800;">📸 ${selectedFiles.length}/100 images</p><div id="pre-box" style="display:flex; gap:10px; overflow-x:auto; padding-bottom:10px;"></div>`;
    selectedFiles.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const wrap = document.createElement('div');
            wrap.style.position = 'relative';
            wrap.innerHTML = `<img src="${e.target.result}" style="width:75px; height:75px; object-fit:cover; border-radius:8px;"><span onclick="removeImage(${idx})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border-radius:50%; width:18px; height:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:12px;">×</span>`;
            document.getElementById('pre-box').appendChild(wrap);
        };
        reader.readAsDataURL(file);
    });
}

function removeImage(idx) { selectedFiles.splice(idx, 1); handleFiles([]); }

async function processTrade() {
    if (selectedFiles.length === 0) return alert("Select card images!");
    const userEmail = localStorage.getItem('currentUser');
    const userObj = JSON.parse(localStorage.getItem(userEmail));
    const meta = JSON.parse(localStorage.getItem('temp_meta'));
    const imageStrings = [];

    for (let file of selectedFiles) {
        const b64 = await new Promise(r => {
            const rd = new FileReader();
            rd.onload = () => r(rd.result);
            rd.readAsDataURL(file);
        });
        imageStrings.push(b64);
    }

    userObj.history.push({
        asset: document.getElementById('up-asset-name').innerText,
        details: `${meta.currency.toUpperCase()} ${meta.amount}`,
        qty: meta.qty,
        payout: document.getElementById('up-asset-total').innerText,
        status: "Pending",
        images: imageStrings,
        date: new Date().toLocaleString()
    });

    localStorage.setItem(userEmail, JSON.stringify(userObj));
    alert("Trade Sent!");
    selectedFiles = [];
    location.reload();
}

// ==========================================
// 5. ADMIN CONTROLS (TRADES & WITHDRAWALS)
// ==========================================
function loadAdminData() {
    const tradeTable = document.getElementById('admin-pending-trades');
    const userTable = document.getElementById('admin-user-list');
    const withdrawTable = document.getElementById('admin-withdraw-list');
    if (!tradeTable || !userTable) return;

    tradeTable.innerHTML = ""; userTable.innerHTML = ""; if(withdrawTable) withdrawTable.innerHTML = "";

    for (let i = 0; i < localStorage.length; i++) {
        const email = localStorage.key(i);
        if (email && email.includes('@')) {
            const u = JSON.parse(localStorage.getItem(email));
            userTable.innerHTML += `<tr><td>${u.name}</td><td>${u.email}</td><td>₦${u.balance.toLocaleString()}</td><td>Active</td></tr>`;
            
            u.history.forEach((t, idx) => {
    if (t.status === "Pending" && !t.type) {
        tradeTable.innerHTML += `<tr>
            <td>${u.name}</td>
            <td>${t.asset}<br><small>${t.details}</small></td>
            <td style="font-weight:800;">${t.qty}</td>
            <td style="font-weight:800;">${t.payout}</td>
            <td>
                <div style="display:flex; gap:5px;">
                    ${t.images.map(img => `
                        <img src="${img}" 
                             style="width:40px; height:40px; object-fit:cover; border-radius:4px; cursor:pointer;" 
                             onclick="viewProof('${img}')">
                    `).join('')}
                </div>
            </td>
            <td>
                            <textarea id="fb-text-${email}-${idx}" placeholder="Decline feedback..." style="width:100px; display:block; font-size:10px; margin-bottom:5px;"></textarea>
                            <input type="file" id="fb-img-${email}-${idx}" style="font-size:10px; width:110px; margin-bottom:5px;">
                            <button onclick="approveTrade('${email}',${idx})" style="background:#10b981; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Approve</button>
                            <button onclick="declineTrade('${email}',${idx})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Decline</button>
                        </td></tr>`;
                }
                if (t.type === "Withdrawal" && t.status === "Pending" && withdrawTable) {
                    const d = t.bankInfo.split(' | ');
                    withdrawTable.innerHTML += `<tr>
                        <td>${u.name}<br><small>${u.email}</small></td>
                        <td><span style="color:#9333ea; font-weight:800;">${d[0]}</span><br>${d[1]}<br><b>${d[2]}</b></td>
                        <td style="color:red; font-weight:800;">-₦${t.amount.toLocaleString()}</td>
                        <td><input type="file" id="receipt-${email}-${idx}" style="font-size:10px; margin-bottom:5px;"><button onclick="markAsPaid('${email}', ${idx})" style="background:#2563eb; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Mark Paid</button></td>
                    </tr>`;
                }
            });
        }
    }
}

async function declineTrade(email, idx) {
    const u = JSON.parse(localStorage.getItem(email));
    if (!u) return;

    // 1. Get the reason for declining
    const txt = prompt("Reason for decline (optional):") || "No reason provided";

    // 2. Update status
    u.history[idx].status = "Declined";
    
    // 3. Add notification to the user
    if (!u.notifications) u.notifications = [];
    u.notifications.unshift({ 
        id: Date.now(), 
        type: 'Trade Declined', 
        text: 'Trade rejected. Msg: ' + txt, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
        read: false 
    });

    // 4. Save and Refresh
    localStorage.setItem(email, JSON.stringify(u));
    alert("Trade Declined!");
    location.reload();
}
// NO EXTRA } SHOULD BE HERE!

function approveTrade(email, idx) {
    const u = JSON.parse(localStorage.getItem(email));
    let val = parseFloat(u.history[idx].payout.replace(/[₦,]/g, ''));
    u.balance = (parseFloat(u.balance) || 0) + val;
    u.history[idx].status = "Success";
    
    // --- ADD THIS LINE ---
    u.notifications.unshift({ id: Date.now(), type: 'Trade Success', text: 'Card approved! ₦' + val.toLocaleString() + ' added to wallet.', time: new Date().toLocaleTimeString(), read: false });

    localStorage.setItem(email, JSON.stringify(u));
    alert("Approved!");
    location.reload();
}


async function markAsPaid(email, idx) {
    const u = JSON.parse(localStorage.getItem(email));
    const file = document.getElementById(`receipt-${email}-${idx}`).files[0];
    let rUrl = "";
    if (file) {
        rUrl = await new Promise(r => {
            const rd = new FileReader();
            rd.onload = () => r(rd.result);
            rd.readAsDataURL(file);
        });
    }
    u.history[idx].status = "Paid"; u.history[idx].receipt = rUrl;
    localStorage.setItem(email, JSON.stringify(u));
    alert("Marked as Paid!"); location.reload();
    u.notifications.unshift({ id: Date.now(), type: 'Payment Sent', text: 'Withdrawal of ₦' + u.history[idx].amount.toLocaleString() + ' is successful.', time: new Date().toLocaleTimeString(), read: false });

    localStorage.setItem(email, JSON.stringify(u));
    alert("Paid!");
    location.reload();
}
// ==========================================
// 6. HISTORY & UTILITIES
// ==========================================
function renderUserHistory() {
    const tbody = document.querySelector('.skybit-table tbody');
    if (!tbody) return;
    const userEmail = localStorage.getItem('currentUser');
    const user = JSON.parse(localStorage.getItem(userEmail));
    if (user && user.history) {
        tbody.innerHTML = user.history.slice().reverse().map(t => {
            const statusColor = t.status === "Pending" ? "#b45309" : (t.status === "Success" || t.status === "Paid" ? "#059669" : "#dc2626");
            return `<tr>
                <td>${t.asset || 'Withdrawal'}</td>
                <td>${t.details || t.bankInfo} (Qty: ${t.qty || 1})</td>
                <td style="font-weight:800; color:${t.type === 'Withdrawal' ? 'red' : '#2563eb'};">${t.payout || '-₦'+t.amount.toLocaleString()}</td>
                <td>
                    <span style="font-weight:900; color:${statusColor};">${t.status}</span>
                    ${t.feedback ? `<br><small style="color:red;">${t.feedback}</small>` : ''}
                    ${t.feedbackImg ? `<br><small style="color:#2563eb; cursor:pointer;" onclick="viewProof('${t.feedbackImg}')">View Proof</small>` : ''}
                    ${t.receipt ? `<br><small style="color:#2563eb; cursor:pointer;" onclick="viewProof('${t.receipt}')">View Receipt</small>` : ''}
                </td>
                <td>${t.date}</td>
            </tr>`;
        }).join('');
    }
}

function viewProof(imgData) {
    const w = window.open("");
    w.document.write(`
        <body style="margin:0; background:#000; display:flex; align-items:center; justify-content:center; height:100vh;">
            <img src="${imgData}" style="max-width:100%; max-height:100vh; object-fit:contain;">
            <div style="position:fixed; top:20px; right:20px; color:white; cursor:pointer; background:rgba(255,255,255,0.2); padding:10px; border-radius:5px; font-family:sans-serif;" onclick="window.close()">Back to Admin</div>
        </body>
    `);
}


function toggleBalance() {
    const b = document.getElementById('balance-amount');
    const e = document.getElementById('eye-icon');
    if (b.classList.contains('hidden-balance')) { b.classList.remove('hidden-balance'); e.innerHTML = '👁️'; }
    else { b.classList.add('hidden-balance'); e.innerHTML = '🙈'; }
}

function navigateTo(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active-section'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active-section');
}

function logout() { localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }
// ==========================================
// 5. NOTIFICATION ENGINE
// ==========================================

function addNotification(type, message) {
    const userEmail = localStorage.getItem('currentUser');
    if (!userEmail) return;
    const userObj = JSON.parse(localStorage.getItem(userEmail));
    
    if (!userObj.notifications) userObj.notifications = [];
    
    const newNoti = {
        id: Date.now(),
        type: type, 
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
    };
    
    userObj.notifications.unshift(newNoti); 
    localStorage.setItem(userEmail, JSON.stringify(userObj));
    renderNotifications();
    
    console.log(`MAIL SENT TO ${userEmail}: [Skybit ${type}] ${message}`);
}

function renderNotifications() {
    const list = document.getElementById('noti-list');
    const badge = document.getElementById('noti-count');
    const userEmail = localStorage.getItem('currentUser');
    
    if (!list || !userEmail) return;

    const userData = localStorage.getItem(userEmail);
    if (!userData) return;
    
    const userObj = JSON.parse(userData);
    const notis = userObj.notifications || [];
    
    // Update Badge
    if (badge) {
        const unread = notis.filter(n => !n.read).length;
        badge.innerText = unread;
        badge.style.display = unread > 0 ? 'block' : 'none';
    }

    if (notis.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:20px; font-size:0.7rem; color:#9ca3af;">No notifications yet.</p>';
        return;
    }

    list.innerHTML = notis.map(n => `
        <div class="noti-item" style="${!n.read ? 'border-left: 3px solid #6366f1;' : ''}">
            <strong>${n.type}:</strong> ${n.text}
            <span class="noti-time">${n.time}</span>
        </div>
    `).join('');
}

function toggleNotiPanel() {
    const p = document.getElementById('noti-panel');
    if (!p) return;
    p.style.display = p.style.display === 'none' ? 'block' : 'none';

    if (p.style.display === 'block') {
        const userEmail = localStorage.getItem('currentUser');
        const userObj = JSON.parse(localStorage.getItem(userEmail));
        if (userObj && userObj.notifications) {
            userObj.notifications.forEach(n => n.read = true);
            localStorage.setItem(userEmail, JSON.stringify(userObj));
            renderNotifications();
        }
    }
}

function clearAllNoti() {
    const userEmail = localStorage.getItem('currentUser');
    const userObj = JSON.parse(localStorage.getItem(userEmail));
    if (userObj) {
        userObj.notifications = [];
        localStorage.setItem(userEmail, JSON.stringify(userObj));
        renderNotifications();
    }
}

// ==========================================
// 6. AUTHENTICATION & NAVIGATION
// ==========================================

function setupAuthListeners() {
    const signupForm = document.getElementById('signupForm');
    
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log("Signup form submitted..."); // This will show in F12 console

            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;

            // Create user object
            const newUser = { 
                name: name, 
                email: email, 
                password: password, 
                balance: 0, 
                history: [], 
                savedBanks: [], 
                notifications: [], 
                role: 'user' 
            };

            // Save to LocalStorage
            localStorage.setItem(email, JSON.stringify(newUser));
            localStorage.setItem('currentUser', email);

            console.log("User saved:", email);
            
            // Redirect
            window.location.href = 'dashboard.html';
        });
    }

    // ... logic for login form 
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;
            const user = JSON.parse(localStorage.getItem(email));
            
            if (user && user.password === password) {
                localStorage.setItem('currentUser', email);
                window.location.href = 'dashboard.html';
            } else { 
                alert("Invalid details!"); 
            }
        });
    }
}

function navigateTo(id) { 
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active-section')); 
    const t = document.getElementById(id); 
    if(t) t.classList.add('active-section'); 
}

function logout() { 
    localStorage.removeItem('currentUser'); 
    window.location.href = 'index.html'; 
}
function saveBankDetails() {
    const userEmail = localStorage.getItem('currentUser');
    // Updated IDs to match your "new-bank-form"
    const accName = document.getElementById('new-acc-name').value;
    const accNumber = document.getElementById('new-acc-num').value;
    const bankName = document.getElementById('new-bank-name').value;

    if (!accName || !accNumber || bankName === "Select Bank") {
        alert("Please fill all bank fields");
        return;
    }

    const userObj = JSON.parse(localStorage.getItem(userEmail));
    if (!userObj.savedBanks) userObj.savedBanks = [];

    const newBank = {
        id: Date.now(), // Unique ID for selecting later
        bankName: bankName,
        accNumber: accNumber,
        accName: accName
    };

    userObj.savedBanks.push(newBank);
    localStorage.setItem(userEmail, JSON.stringify(userObj));
    
    alert("Bank details saved!");
    
    // Clear the form and hide it
    document.getElementById('new-acc-name').value = "";
    document.getElementById('new-acc-num').value = "";
    document.getElementById('new-bank-form').style.display = 'none';

    renderBankDropdown(); // Refresh the dropdown immediately
}

function renderBankDropdown() {
    // Updated ID to match your HTML select box
    const dropdown = document.getElementById('saved-bank-selector');
    const userEmail = localStorage.getItem('currentUser');
    if (!dropdown || !userEmail) return;

    const userObj = JSON.parse(localStorage.getItem(userEmail));
    const banks = userObj.savedBanks || [];

    if (banks.length === 0) {
        dropdown.innerHTML = '<option value="">-- No Saved Banks --</option>';
        return;
    }

    dropdown.innerHTML = '<option value="">-- Select Saved Bank --</option>' + 
        banks.map(b => `<option value="${b.id}">${b.bankName} - ${b.accNumber}</option>`).join('');
}

function submitWithdrawalRequest() {
    const userEmail = localStorage.getItem('currentUser');
    const bankId = document.getElementById('saved-bank-selector').value;
    const amountInput = document.getElementById('withdraw-amount');
    const amount = parseFloat(amountInput.value);
    
    if (!userEmail) return;
    const userData = JSON.parse(localStorage.getItem(userEmail));

    if (!bankId) return alert("Please select a saved bank.");
    if (isNaN(amount) || amount <= 0) return alert("Enter a valid amount.");
    if (amount > userData.balance) return alert("Insufficient funds.");

    // Find the bank details using the ID from the dropdown
    const bank = userData.savedBanks.find(b => b.id == bankId);
    if (!bank) return alert("Bank selection error.");

    // Update user balance
    userData.balance -= amount;
    
    const request = {
        id: "WD-" + Math.floor(Math.random() * 10000),
        type: "Withdrawal",
        amount: amount,
        bank: bank.bankName,
        status: "Pending",
        date: new Date().toLocaleDateString()
    };

    if (!userData.history) userData.history = [];
    userData.history.unshift(request);

    localStorage.setItem(userEmail, JSON.stringify(userData));
    
    if (typeof addNotification === "function") {
        addNotification('Withdrawal', `Request of ₦${amount.toLocaleString()} sent to ${bank.bankName}.`);
    }

    alert("Withdrawal request submitted!");
    location.reload(); 
}