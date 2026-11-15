/* =====================================================
   AERDZ — data.js
   Couche de données, sécurité (SHA-256), utilitaires
   ===================================================== */

const LS_INSCRIPTIONS = 'aerdz_inscriptions_v1';
const LS_PWD          = 'aerdz_admin_pwd_hash';
const LS_COUNTER      = 'aerdz_card_counter';
const SESSION_KEY     = 'aerdz_admin_session';

/* ---------- SHA-256 (pur JS) ---------- */
function sha256(str) {
  const ascii = unescape(encodeURIComponent(str));
  function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
  const mp = Math.pow, mw = mp(2, 32);
  let i, j, result = '', words = [], asciiBitLength = ascii.length * 8;
  let hash = sha256.h = sha256.h || [];
  let k = sha256.k = sha256.k || [];
  let primeCounter = k.length;
  const isComposite = {};
  for (let c = 2; primeCounter < 64; c++) {
    if (!isComposite[c]) {
      for (i = 0; i < 313; i += c) isComposite[i] = c;
      hash[primeCounter] = (mp(c, .5) * mw) | 0;
      k[primeCounter++] = (mp(c, 1 / 3) * mw) | 0;
    }
  }
  let p = ascii + '\x80';
  while (p.length % 64 - 56) p += '\x00';
  for (i = 0; i < p.length; i++) {
    j = p.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiBitLength / mw) | 0);
  words[words.length] = asciiBitLength;
  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16), oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
      const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = i < 16 ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/* ---------- Helpers ---------- */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return '—'; }
}
function normaliser(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}
function getAnneeUniversitaire() {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth();
  return m >= 8 ? `${y} - ${y + 1}` : `${y - 1} - ${y}`;
}

/* ---------- Inscriptions ---------- */
function getInscriptions() {
  try { return JSON.parse(localStorage.getItem(LS_INSCRIPTIONS)) || []; }
  catch { return []; }
}
function saveInscriptions(list) { localStorage.setItem(LS_INSCRIPTIONS, JSON.stringify(list)); }
function addInscription(data) {
  const list = getInscriptions();
  const insc = { id: uid(), ...data, statut: 'en_attente', numeroCarte: null, dateDelivrance: null, dateInscription: new Date().toISOString() };
  list.push(insc);
  saveInscriptions(list);
  return insc;
}
function updateInscription(id, patch) {
  const list = getInscriptions();
  const i = list.findIndex(x => x.id === id);
  if (i === -1) return null;
  list[i] = { ...list[i], ...patch };
  saveInscriptions(list);
  return list[i];
}
function prochainNumeroCarte() {
  const annee = new Date().getFullYear();
  const n = (parseInt(localStorage.getItem(LS_COUNTER) || '0', 10) + 1);
  localStorage.setItem(LS_COUNTER, String(n));
  return `AERDZ-${annee}-${String(n).padStart(3, '0')}`;
}

/* ---------- Auth Admin ---------- */
function initAdminPassword() {
  if (!localStorage.getItem(LS_PWD)) {
    localStorage.setItem(LS_PWD, sha256('Diallo405#'));
  }
}
function verifierMotDePasse(pwd) {
  initAdminPassword();
  return sha256(pwd) === localStorage.getItem(LS_PWD);
}
function changerMotDePasse(nouveau) { localStorage.setItem(LS_PWD, sha256(nouveau)); }
function estConnecte() { return sessionStorage.getItem(SESSION_KEY) === '1'; }
function connecter() { sessionStorage.setItem(SESSION_KEY, '1'); }
function deconnecter() { sessionStorage.removeItem(SESSION_KEY); }

/* ---------- Compression d'image ---------- */
function compresserImage(file, maxSize = 500, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
        else if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error("Image invalide"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Erreur de lecture"));
    reader.readAsDataURL(file);
  });
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initAdminPassword();
  const burger = document.querySelector('.burger');
  const navLinks = document.querySelector('.nav-links');
  if (burger && navLinks) burger.addEventListener('click', () => navLinks.classList.toggle('open'));
});