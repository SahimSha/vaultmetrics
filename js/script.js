// ==========================================
// PURE FUNCTIONS
// ==========================================
const qwertyMap = {
    'q':{x:0,y:0,h:'L'},'w':{x:1,y:0,h:'L'},'e':{x:2,y:0,h:'L'},'r':{x:3,y:0,h:'L'},'t':{x:4,y:0,h:'L'},'y':{x:5,y:0,h:'R'},'u':{x:6,y:0,h:'R'},'i':{x:7,y:0,h:'R'},'o':{x:8,y:0,h:'R'},'p':{x:9,y:0,h:'R'},
    'a':{x:0.5,y:1,h:'L'},'s':{x:1.5,y:1,h:'L'},'d':{x:2.5,y:1,h:'L'},'f':{x:3.5,y:1,h:'L'},'g':{x:4.5,y:1,h:'L'},'h':{x:5.5,y:1,h:'R'},'j':{x:6.5,y:1,h:'R'},'k':{x:7.5,y:1,h:'R'},'l':{x:8.5,y:1,h:'R'},
    'z':{x:1,y:2,h:'L'},'x':{x:2,y:2,h:'L'},'c':{x:3,y:2,h:'L'},'v':{x:4,y:2,h:'L'},'b':{x:5,y:2,h:'L'},'n':{x:6,y:2,h:'R'},'m':{x:7,y:2,h:'R'}
};

function analyzeErgonomics(pwd) {
    if(pwd.length < 2) return { score: "N/A", color: "var(--text-secondary)" };
    let distance = 0, handSwitches = 0;
    const chars = pwd.toLowerCase().split('');
    for(let i=1; i<chars.length; i++) {
        const prev = qwertyMap[chars[i-1]], curr = qwertyMap[chars[i]];
        if(prev && curr) {
            distance += Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
            if(prev.h !== curr.h) handSwitches++;
        }
    }
    const avgDistance = distance / (pwd.length || 1), switchRatio = handSwitches / (pwd.length || 1);
    if (switchRatio > 0.4 && avgDistance > 1.5) return { score: "Fluid", color: "var(--strong)" };
    if (switchRatio < 0.2) return { score: "One-Hand Heavy", color: "var(--warning)" };
    return { score: "Moderate", color: "var(--good)" };
}

function generateMutations(pwd) {
    if(pwd.length === 0 || pwd.length > 15) return [];
    const leet = pwd.replace(/a/ig,'@').replace(/e/ig,'3').replace(/i/ig,'1').replace(/o/ig,'0').replace(/s/ig,'$');
    const upper = pwd.charAt(0).toUpperCase() + pwd.slice(1);
    return [leet, pwd + "123", upper + "!", pwd + new Date().getFullYear(), upper + "123!"].filter(v => v.toLowerCase() !== pwd.toLowerCase());
}

function getPoolSize(pwd) {
    let s = 0;
    if(/[a-z]/.test(pwd)) s+=26; if(/[A-Z]/.test(pwd)) s+=26;
    if(/[0-9]/.test(pwd)) s+=10; if(/[^A-Za-z0-9]/.test(pwd)) s+=32;
    return s;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyzeErgonomics, generateMutations, getPoolSize };
}

// ==========================================
// DOM MANIPULATION & LOGIC 
// ==========================================
if (typeof window !== 'undefined') {

    // PWA & EXTENSION UI LOGIC
    let deferredPrompt;
    const installPwaBtn = document.getElementById('install-pwa-btn');
    const extensionModalBtn = document.getElementById('extension-modal-btn');
    const extensionModal = document.getElementById('extension-modal');
    const closeModalBtn = document.querySelector('.close-modal');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if(installPwaBtn) installPwaBtn.classList.remove('hidden');
    });

    if(installPwaBtn) {
        installPwaBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') installPwaBtn.classList.add('hidden');
            deferredPrompt = null;
        });
    }

    window.addEventListener('appinstalled', () => {
        if(installPwaBtn) installPwaBtn.classList.add('hidden');
        deferredPrompt = null;
    });

    if(extensionModalBtn && extensionModal && closeModalBtn) {
        extensionModalBtn.addEventListener('click', () => extensionModal.classList.remove('hidden'));
        closeModalBtn.addEventListener('click', () => extensionModal.classList.add('hidden'));
        window.addEventListener('click', (e) => { if (e.target === extensionModal) extensionModal.classList.add('hidden'); });
    }

    // TAB SWITCHING LOGIC
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));
            
            e.target.classList.add('active');
            const target = e.target.getAttribute('data-target');
            document.getElementById(`section-${target}`).classList.remove('hidden');
            
            if(target !== 'analyze') {
                document.documentElement.style.setProperty('--bg-color', '#0f172a');
            } else if (DOM.input && DOM.input.value) {
                analyzePassword(DOM.input.value); 
            }
        });
    });

    // ANALYZER LOGIC
    const DOM = {
        input: document.getElementById('password-input'),
        toggleBtn: document.getElementById('toggle-visibility'),
        score: document.getElementById('vault-score'),
        ring: document.getElementById('vault-score-ring'),
        entropy: document.getElementById('entropy-val'),
        pwned: document.getElementById('pwned-val'),
        ergo: document.getElementById('ergo-val'),
        feedback: document.getElementById('feedback-list'),
        matrixSec: document.getElementById('matrix-section'),
        matrixGrid: document.getElementById('mutation-grid')
    };

    if (DOM.toggleBtn) {
        DOM.toggleBtn.addEventListener('click', () => {
            const isPwd = DOM.input.type === 'password';
            DOM.input.type = isPwd ? 'text' : 'password';
            DOM.toggleBtn.innerHTML = isPwd ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        });
    }

    function analyzePassword(password) {
        if (!password) return resetUI();

        const analysis = typeof zxcvbn !== 'undefined' ? zxcvbn(password) : { score: 0, feedback: { warning: '', suggestions: [] } };
        let entropy = password.length * Math.log2(getPoolSize(password) || 1);
        DOM.entropy.innerText = `${Math.round(entropy)} bits`;

        const ergo = analyzeErgonomics(password);
        DOM.ergo.innerText = ergo.score;
        DOM.ergo.style.color = ergo.color;

        let score = (analysis.score / 4) * 100;
        if (password.length >= 16 && /[\s\-]/.test(password) && score < 100) score = Math.min(100, score + 15);
        if (password.length < 8) score = Math.min(score, 30);
        
        updateTheme(score);
        updateFeedback(analysis.feedback);
        
        const mutations = generateMutations(password);
        if (mutations.length > 0) {
            DOM.matrixSec.classList.remove('hidden');
            DOM.matrixGrid.innerHTML = mutations.map(m => `<div class="mutation-tag">${m}</div>`).join('');
        } else {
            DOM.matrixSec.classList.add('hidden');
        }
    }

    function updateTheme(score) {
        DOM.score.innerText = Math.round(score);
        let c = "#ef4444", b = "#2a0f12";
        if (score >= 80) { c = "#22c55e"; b = "#0f2a17"; }
        else if (score >= 50) { c = "#f59e0b"; b = "#2a210f"; }
        
        document.documentElement.style.setProperty('--bg-color', b);
        document.documentElement.style.setProperty('--score-color', c);
        DOM.ring.style.boxShadow = `0 0 20px ${c}40`;
        DOM.ring.style.color = c;
    }

    function updateFeedback(fb) {
        let msgs = fb.warning ? [`<strong>Warning:</strong> ${fb.warning}`] : [];
        msgs.push(...fb.suggestions);
        if (msgs.length === 0) msgs.push("Your credential looks incredibly secure.");
        DOM.feedback.innerHTML = msgs.map(m => `<li><i class="fa-solid fa-chevron-right" style="color:var(--score-color);"></i> ${m}</li>`).join('');
    }

    async function checkBreach(pwd) {
        if (!pwd) return;
        DOM.pwned.innerText = "Checking..."; DOM.pwned.style.color = "var(--text-secondary)";
        try {
            const hashHex = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(pwd))))
                .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            
            const res = await fetch(`https://api.pwnedpasswords.com/range/${hashHex.substring(0,5)}`);
            const match = (await res.text()).split('\n').find(h => h.startsWith(hashHex.substring(5)));

            if (match) {
                DOM.pwned.innerText = `Leaked (${match.split(':')[1].trim()}x)`;
                DOM.pwned.style.color = "var(--danger)";
                updateTheme(10); DOM.score.innerText = "10";
                DOM.feedback.innerHTML = `<li style="color:var(--danger)"><strong>CRITICAL:</strong> Compromised password. Do not use.</li>`;
            } else {
                DOM.pwned.innerText = "Safe"; DOM.pwned.style.color = "var(--strong)";
            }
        } catch (e) { DOM.pwned.innerText = "API Error"; }
    }

    function resetUI() {
        DOM.score.innerText = '0'; DOM.entropy.innerText = '0 bits'; DOM.ergo.innerText = 'N/A';
        DOM.pwned.innerText = 'Waiting...'; DOM.pwned.style.color = 'var(--text-primary)';
        document.documentElement.style.setProperty('--bg-color', '#0f172a');
        document.documentElement.style.setProperty('--score-color', '#334155');
        DOM.ring.style.boxShadow = 'none'; DOM.ring.style.color = 'var(--text-primary)';
        DOM.feedback.innerHTML = '<li>Enter a password to initiate analysis.</li>';
        DOM.matrixSec.classList.add('hidden');
    }

    let timeout;
    if (DOM.input) {
        DOM.input.addEventListener('input', e => {
            analyzePassword(e.target.value);
            clearTimeout(timeout);
            if(e.target.value) timeout = setTimeout(() => checkBreach(e.target.value), 800);
        });
    }

    // GENERATOR LOGIC
    const mnemonics = {
        adj: ["Neon", "Quantum", "Cyber", "Lunar", "Solar", "Ghostly", "Frozen", "Golden"],
        noun: ["Dragon", "Wizard", "Ninja", "Cyborg", "Kraken", "Phoenix", "Samurai"],
        verb: ["Hacking", "Riding", "Throwing", "Eating", "Smashing", "Lifting"],
        obj: ["Server", "Laser", "Pizza", "Asteroid", "Firewall", "Hoverboard"]
    };

    const GenDOM = {
        mode: document.getElementById('gen-mode'),
        len: document.getElementById('gen-length'),
        lenLabel: document.getElementById('length-label'),
        opts: document.getElementById('standard-options'),
        out: document.getElementById('generated-password'),
        qr: document.getElementById('qrcode'),
        story: document.getElementById('mnemonic-box'),
        chkUp: document.getElementById('inc-uppercase'),
        chkNum: document.getElementById('inc-numbers'),
        chkSym: document.getElementById('inc-symbols'),
        genBtn: document.getElementById('generate-btn'),
        copyBtn: document.getElementById('copy-btn')
    };

    let qrCodeData = null;

    function loadPreferences() {
        if(localStorage.getItem('vm-mode')) {
            GenDOM.mode.value = localStorage.getItem('vm-mode');
            GenDOM.len.value = localStorage.getItem('vm-len');
            GenDOM.chkUp.checked = localStorage.getItem('vm-up') === 'true';
            GenDOM.chkNum.checked = localStorage.getItem('vm-num') === 'true';
            GenDOM.chkSym.checked = localStorage.getItem('vm-sym') === 'true';
        }
        updateGenUI();
    }

    function savePreferences() {
        localStorage.setItem('vm-mode', GenDOM.mode.value);
        localStorage.setItem('vm-len', GenDOM.len.value);
        localStorage.setItem('vm-up', GenDOM.chkUp.checked);
        localStorage.setItem('vm-num', GenDOM.chkNum.checked);
        localStorage.setItem('vm-sym', GenDOM.chkSym.checked);
    }

    function updateGenUI() {
        if (!GenDOM.mode) return;
        const isPass = GenDOM.mode.value === 'passphrase';
        GenDOM.opts.classList.toggle('hidden', isPass);
        GenDOM.len.min = isPass ? 3 : 8;
        GenDOM.len.max = isPass ? 6 : 64;
        
        if (isPass && GenDOM.len.value > 6) GenDOM.len.value = 4;
        if (!isPass && GenDOM.len.value < 8) GenDOM.len.value = 16;
        
        GenDOM.lenLabel.innerText = GenDOM.len.value;
        savePreferences();
    }

    if (GenDOM.mode) {
        GenDOM.mode.addEventListener('change', updateGenUI);
        GenDOM.len.addEventListener('input', e => { GenDOM.lenLabel.innerText = e.target.value; savePreferences(); });
        [GenDOM.chkUp, GenDOM.chkNum, GenDOM.chkSym].forEach(el => el.addEventListener('change', savePreferences));

        GenDOM.genBtn.addEventListener('click', () => {
            let result = '';
            GenDOM.story.classList.add('hidden');

            if (GenDOM.mode.value === 'passphrase') {
                const getRand = arr => arr[Math.floor(Math.random() * arr.length)];
                const words = [getRand(mnemonics.adj), getRand(mnemonics.noun), getRand(mnemonics.verb), getRand(mnemonics.obj)];
                
                while(words.length < GenDOM.len.value) words.push(getRand(mnemonics.adj));
                result = words.slice(0, GenDOM.len.value).join('-').toLowerCase();
                
                if(GenDOM.len.value == 4) {
                    GenDOM.story.innerHTML = `<i class="fa-solid fa-brain" style="color:var(--accent);"></i> <strong>Memory Palace:</strong> "Imagine a <em>${words[0]} ${words[1]}</em> who is <em>${words[2]}</em> a <em>${words[3]}</em>."`;
                    GenDOM.story.classList.remove('hidden');
                }
            } else {
                let chars = "abcdefghijklmnopqrstuvwxyz";
                if(GenDOM.chkUp.checked) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                if(GenDOM.chkNum.checked) chars += "0123456789";
                if(GenDOM.chkSym.checked) chars += "!@#$%^&*()_+~`|}{[]:;?><,./-=";
                
                for(let i=0; i<GenDOM.len.value; i++) {
                    const rand = new Uint32Array(1);
                    window.crypto.getRandomValues(rand);
                    result += chars[rand[0] % chars.length];
                }
            }

            GenDOM.out.innerText = result;
            
            if (typeof QRCode !== 'undefined') {
                GenDOM.qr.innerHTML = '';
                qrCodeData = new QRCode(GenDOM.qr, {
                    text: result, width: 128, height: 128,
                    colorDark : "#0f172a", colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.L
                });
            }
        });

        GenDOM.copyBtn.addEventListener('click', () => {
            const txt = GenDOM.out.innerText;
            if(txt === 'Select options below') return;
            navigator.clipboard.writeText(txt).then(() => {
                GenDOM.copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                GenDOM.copyBtn.style.background = 'var(--strong)';
                setTimeout(() => { 
                    GenDOM.copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy'; 
                    GenDOM.copyBtn.style.background = 'var(--accent)'; 
                }, 2000);
            });
        });

        loadPreferences();
    }

    // WEBAUTHN / PASSKEY DEMO
    const passkeyBtn = document.getElementById('demo-passkey-btn');
    const passkeyConsole = document.getElementById('passkey-console');
    const passkeyLog = document.getElementById('passkey-log');

    if (passkeyBtn) {
        passkeyBtn.addEventListener('click', async () => {
            passkeyConsole.classList.remove('hidden');
            passkeyLog.innerText = "Initializing WebAuthn Challenge...\nWaiting for user biometric verification...";

            const publicKeyOptions = {
                challenge: window.crypto.getRandomValues(new Uint8Array(32)),
                rp: { name: "VaultMetrics App", id: window.location.hostname || "localhost" },
                user: {
                    id: window.crypto.getRandomValues(new Uint8Array(16)),
                    name: "demo@vaultmetrics.app",
                    displayName: "VaultMetrics Demo User"
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
                authenticatorSelection: {
                    authenticatorAttachment: "platform", 
                    userVerification: "required"
                },
                timeout: 60000,
                attestation: "none"
            };

            try {
                const credential = await navigator.credentials.create({ publicKey: publicKeyOptions });
                const rawId = Array.from(new Uint8Array(credential.rawId)).map(b => b.toString(16).padStart(2,'0')).join('');
                
                passkeyLog.innerHTML = `<span style="color: var(--strong);">[SUCCESS]</span> Passkey Created!\n\n` +
                                       `<strong>Credential ID:</strong>\n${rawId}\n\n` +
                                       `<strong>Type:</strong> ${credential.type}\n` + 
                                       `<strong>Authenticator Attached:</strong> True\n\n` +
                                       `<span style="color: var(--text-secondary);">Your private key remains securely locked in your device's hardware enclave. Only the public key was shared.</span>`;
            } catch (error) {
                passkeyLog.innerHTML = `<span style="color: var(--danger);">[ABORTED]</span>\nError: ${error.message}\n\nDid you cancel the biometric prompt, or is WebAuthn unsupported on this specific browser/environment?`;
            }
        });
    }
}